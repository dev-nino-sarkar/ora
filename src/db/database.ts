// src/db/database.ts
// SQLite database setup using expo-sqlite.
// Initializes all tables with proper schema and runs migrations.

import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

/** Get or open the singleton database connection. */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('oa_scout.db');
  await initializeSchema(_db);
  return _db;
}

/** Create all tables if they don't exist. Safe to call repeatedly. */
async function initializeSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    -- Patients table
    CREATE TABLE IF NOT EXISTS patients (
      id            TEXT PRIMARY KEY NOT NULL,
      name          TEXT NOT NULL,
      age           INTEGER NOT NULL,
      sex           TEXT NOT NULL CHECK(sex IN ('Male','Female','Other')),
      village_code  TEXT NOT NULL,
      registered_at TEXT NOT NULL
    );

    -- Assessments table (stores the full assessment payload as JSON)
    CREATE TABLE IF NOT EXISTS assessments (
      id                      TEXT PRIMARY KEY NOT NULL,
      patient_id              TEXT NOT NULL REFERENCES patients(id),
      questionnaire_version   TEXT NOT NULL DEFAULT '1.0.0',
      answers_json            TEXT NOT NULL DEFAULT '{}',
      kinematic_data_json     TEXT,
      medical_history_json    TEXT,
      photo_paths_json        TEXT,
      is_flagged              INTEGER NOT NULL DEFAULT 0,
      conducted_at            TEXT NOT NULL,
      worker_id               TEXT NOT NULL,
      facility_code           TEXT NOT NULL
    );

    -- Sync queue table
    CREATE TABLE IF NOT EXISTS sync_queue (
      id                TEXT PRIMARY KEY NOT NULL,
      assessment_id     TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
      status            TEXT NOT NULL DEFAULT 'pending'
                          CHECK(status IN ('pending','in_progress','synced','failed','conflict')),
      retry_count       INTEGER NOT NULL DEFAULT 0,
      created_at        TEXT NOT NULL,
      last_attempt_at   TEXT,
      last_error        TEXT
    );

    -- Index for fast pending record queries
    CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
    CREATE INDEX IF NOT EXISTS idx_assessments_patient ON assessments(patient_id);
  `);
}
