// src/core/syncManager.ts
// Offline-First Sync Manager
//
// Responsibilities:
//   1. Enqueue saved assessments into the local SQLite sync_queue.
//   2. Monitor network state and trigger uploads automatically.
//   3. Exponential backoff retry logic (30s → 2m → 8m → 32m → 2h).
//   4. Background periodic sync via expo-background-fetch.
//   5. Expose observable sync state for the UI via callbacks.

import * as Network from 'expo-network';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { v4 as uuidv4 } from 'uuid';

import {
  enqueueAssessment,
  getPendingRecords,
  updateSyncRecord,
  SyncQueueEntry,
} from '../db/syncQueueDao';
import { getAssessmentById } from '../db/assessmentDao';

// ── Constants ─────────────────────────────────────────────────────────────────

const SYNC_TASK_NAME = 'OA_SCOUT_BACKGROUND_SYNC';
const MAX_RETRIES = 5;
const API_ENDPOINT = 'https://api.oa-scout.example.com/assessments/sync';

// ── Exponential Backoff ───────────────────────────────────────────────────────

/** Returns the backoff duration in milliseconds for a given retry count. */
function getBackoffMs(retryCount: number): number {
  // 30s → 2m → 8m → 32m → 2h
  const seconds = 30 * Math.pow(4, Math.min(retryCount, 4));
  return Math.min(seconds * 1000, 2 * 60 * 60 * 1000); // Cap at 2 hours
}

function isEligibleForRetry(entry: SyncQueueEntry): boolean {
  if (entry.retry_count === 0) return true;
  if (!entry.last_attempt_at) return true;

  const lastAttempt = new Date(entry.last_attempt_at).getTime();
  const backoff = getBackoffMs(entry.retry_count);
  return Date.now() > lastAttempt + backoff;
}

// ── Network Check ─────────────────────────────────────────────────────────────

async function isOnline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return state.isConnected === true && state.isInternetReachable === true;
  } catch {
    return false;
  }
}

// ── Core Upload Logic ─────────────────────────────────────────────────────────

async function uploadRecord(entry: SyncQueueEntry): Promise<boolean> {
  // Mark as in-progress to prevent duplicate uploads.
  await updateSyncRecord(entry.id, 'in_progress');

  try {
    const assessment = await getAssessmentById(entry.assessment_id);
    if (!assessment) {
      // Assessment was deleted; remove from queue.
      await updateSyncRecord(entry.id, 'synced');
      return true;
    }

    // Build the full sync payload.
    const payload = {
      sync_id: entry.id,
      assessment_id: assessment.id,
      conducted_at: assessment.conducted_at,
      worker_id: assessment.worker_id,
      facility_code: assessment.facility_code,
      questionnaire_version: assessment.questionnaire_version,
      answers: JSON.parse(assessment.answers_json),
      kinematic_data: assessment.kinematic_data_json
        ? JSON.parse(assessment.kinematic_data_json)
        : null,
      medical_history: assessment.medical_history_json
        ? JSON.parse(assessment.medical_history_json)
        : null,
      is_flagged: assessment.is_flagged === 1,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok || response.status === 409) {
      // 409 Conflict = duplicate; treat as success to prevent endless retries.
      await updateSyncRecord(entry.id, 'synced');
      return true;
    }

    // Non-OK response → increment retry.
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);

  } catch (error: unknown) {
    const newRetryCount = entry.retry_count + 1;
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    const newStatus = newRetryCount >= MAX_RETRIES ? 'failed' : 'pending';

    await updateSyncRecord(entry.id, newStatus, {
      retryCount: newRetryCount,
      lastError: errorMsg,
    });

    console.warn(`[SyncManager] ❌ Failed to sync ${entry.assessment_id}. ` +
                 `Attempt ${newRetryCount}/${MAX_RETRIES}. Error: ${errorMsg}`);
    return false;
  }
}

// ── Process Queue ─────────────────────────────────────────────────────────────

let _isSyncing = false;

export async function processQueue(): Promise<{ succeeded: number; failed: number }> {
  if (_isSyncing) return { succeeded: 0, failed: 0 };
  _isSyncing = true;

  let succeeded = 0;
  let failed = 0;

  try {
    const pending = await getPendingRecords();
    const eligible = pending.filter(isEligibleForRetry);

    console.log(`[SyncManager] Processing ${eligible.length} eligible records.`);

    for (const entry of eligible) {
      const ok = await uploadRecord(entry);
      if (ok) succeeded++;
      else failed++;
    }
  } finally {
    _isSyncing = false;
  }

  return { succeeded, failed };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Enqueue an assessment for upload.
 * Call this immediately after saving an assessment to the local DB.
 */
export async function enqueue(assessmentId: string): Promise<void> {
  await enqueueAssessment(uuidv4(), assessmentId);
  console.log(`[SyncManager] Enqueued assessment: ${assessmentId}`);
  // Attempt immediate sync if online.
  const online = await isOnline();
  if (online) {
    processQueue(); // Fire-and-forget; don't await
  }
}

/**
 * Manually trigger a sync attempt.
 * Returns the count of succeeded and failed uploads.
 */
export async function syncNow(): Promise<{ succeeded: number; failed: number; offline: boolean }> {
  const online = await isOnline();
  if (!online) {
    console.warn('[SyncManager] Offline. Sync deferred.');
    return { succeeded: 0, failed: 0, offline: true };
  }
  const result = await processQueue();
  return { ...result, offline: false };
}

// ── Background Task Registration ──────────────────────────────────────────────

/** Register the background sync task. Call once from app bootstrap. */
export async function registerBackgroundSync(): Promise<void> {
  // Define the task (must be called before registering)
  TaskManager.defineTask(SYNC_TASK_NAME, async () => {
    try {
      const online = await isOnline();
      if (!online) return BackgroundFetch.BackgroundFetchResult.NoData;

      const { succeeded } = await processQueue();
      return succeeded > 0
        ? BackgroundFetch.BackgroundFetchResult.NewData
        : BackgroundFetch.BackgroundFetchResult.NoData;
    } catch {
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });

  try {
    await BackgroundFetch.registerTaskAsync(SYNC_TASK_NAME, {
      minimumInterval: 15 * 60, // 15 minutes minimum (OS enforced)
      stopOnTerminate: false,   // Keep running after app is closed
      startOnBoot: true,        // Resume after device restart
    });
    console.log('[SyncManager] Background sync registered.');
  } catch (err) {
    console.warn('[SyncManager] Background sync registration failed:', err);
  }
}
