ALTER TABLE anamnese_sessions
  ADD COLUMN title TEXT,
  ALTER COLUMN appointment_id DROP NOT NULL;

-- Change FK behavior: if the linked appointment is deleted, nullify instead of cascade
ALTER TABLE anamnese_sessions
  DROP CONSTRAINT anamnese_sessions_appointment_id_fkey,
  ADD CONSTRAINT anamnese_sessions_appointment_id_fkey
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL;
