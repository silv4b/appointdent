ALTER TABLE patients ADD COLUMN email TEXT;

CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email);
