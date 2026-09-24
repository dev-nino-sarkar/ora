// src/db/assessmentDao.ts
// Data Access Object for the assessments and patients tables.

import * as SQLite from 'expo-sqlite';
import { getDatabase } from './database';

export interface Patient {
  id: string;
  name: string;
  age: number;
  sex: 'Male' | 'Female' | 'Other';
  village_code: string;
  registered_at: string;
}

export interface Assessment {
  id: string;
  patient_id: string;
  questionnaire_version: string;
  answers_json: string;
  kinematic_data_json?: string | null;
  medical_history_json?: string | null;
  photo_paths_json?: string | null;
  is_flagged: number;
  conducted_at: string;
  worker_id: string;
  facility_code: string;
}

/** Insert or update a patient record. */
export async function upsertPatient(patient: Patient): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO patients
      (id, name, age, sex, village_code, registered_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [patient.id, patient.name, patient.age, patient.sex, patient.village_code, patient.registered_at]
  );
}

/** Insert a completed assessment. */
export async function insertAssessment(assessment: Assessment): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO assessments
      (id, patient_id, questionnaire_version, answers_json, kinematic_data_json,
       medical_history_json, photo_paths_json, is_flagged, conducted_at, worker_id, facility_code)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      assessment.id,
      assessment.patient_id,
      assessment.questionnaire_version,
      assessment.answers_json,
      assessment.kinematic_data_json ?? null,
      assessment.medical_history_json ?? null,
      assessment.photo_paths_json ?? null,
      assessment.is_flagged,
      assessment.conducted_at,
      assessment.worker_id,
      assessment.facility_code,
    ]
  );
}

/** Get all assessments (joined with patient name), ordered by date. */
export async function getAllAssessments(): Promise<(Assessment & { patient_name: string })[]> {
  const db = await getDatabase();
  return db.getAllAsync<Assessment & { patient_name: string }>(
    `SELECT a.*, p.name AS patient_name
     FROM assessments a
     JOIN patients p ON a.patient_id = p.id
     ORDER BY a.conducted_at DESC`
  );
}

/** Get a single assessment by ID with its full payload. */
export async function getAssessmentById(id: string): Promise<Assessment | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Assessment>(
    `SELECT * FROM assessments WHERE id = ?`,
    [id]
  );
}

/** Delete an assessment (cascade deletes its sync_queue entry). */
export async function deleteAssessment(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM assessments WHERE id = ?`, [id]);
}

/** Search patients by name prefix. */
export async function searchPatients(query: string): Promise<Patient[]> {
  const db = await getDatabase();
  return db.getAllAsync<Patient>(
    `SELECT * FROM patients WHERE name LIKE ? ORDER BY name LIMIT 20`,
    [`${query}%`]
  );
}
