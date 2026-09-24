// src/db/syncQueueDao.ts
// Data Access Object for the sync_queue table.

import { getDatabase } from './database';

export type SyncStatus = 'pending' | 'in_progress' | 'synced' | 'failed' | 'conflict';

export interface SyncQueueEntry {
  id: string;
  assessment_id: string;
  status: SyncStatus;
  retry_count: number;
  created_at: string;
  last_attempt_at: string | null;
  last_error: string | null;
}

/** Add a new entry to the sync queue. */
export async function enqueueAssessment(id: string, assessmentId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO sync_queue (id, assessment_id, status, retry_count, created_at)
     VALUES (?, ?, 'pending', 0, ?)`,
    [id, assessmentId, new Date().toISOString()]
  );
}

/** Fetch all pending/failed records eligible for retry. */
export async function getPendingRecords(): Promise<SyncQueueEntry[]> {
  const db = await getDatabase();
  return db.getAllAsync<SyncQueueEntry>(
    `SELECT * FROM sync_queue WHERE status IN ('pending', 'failed') ORDER BY created_at ASC`
  );
}

/** Fetch all records for the UI list. */
export async function getAllSyncRecords(): Promise<SyncQueueEntry[]> {
  const db = await getDatabase();
  return db.getAllAsync<SyncQueueEntry>(
    `SELECT * FROM sync_queue ORDER BY created_at DESC`
  );
}

/** Get count by status for the home screen badge. */
export async function getSyncStatusCounts(): Promise<{ pending: number; synced: number; failed: number }> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ status: string; count: number }>(
    `SELECT status, COUNT(*) as count FROM sync_queue GROUP BY status`
  );
  const counts = { pending: 0, synced: 0, failed: 0 };
  for (const row of rows) {
    if (row.status === 'pending' || row.status === 'in_progress') counts.pending += row.count;
    else if (row.status === 'synced') counts.synced += row.count;
    else if (row.status === 'failed' || row.status === 'conflict') counts.failed += row.count;
  }
  return counts;
}

/** Update the status and metadata of a sync queue record. */
export async function updateSyncRecord(
  id: string,
  status: SyncStatus,
  opts: { retryCount?: number; lastError?: string | null } = {}
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE sync_queue
     SET status = ?,
         retry_count = COALESCE(?, retry_count),
         last_attempt_at = ?,
         last_error = COALESCE(?, last_error)
     WHERE id = ?`,
    [
      status,
      opts.retryCount ?? null,
      new Date().toISOString(),
      opts.lastError ?? null,
      id,
    ]
  );
}

/** Remove a synced record from the queue (cleanup). */
export async function deleteSyncRecord(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM sync_queue WHERE id = ?`, [id]);
}
