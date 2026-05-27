-- Add return_to_id column to appointments table
ALTER TABLE appointments ADD COLUMN return_to_id UUID REFERENCES appointments(id) ON DELETE SET NULL;

-- Index for return lookups
CREATE INDEX idx_appointments_return_to ON appointments(return_to_id);
