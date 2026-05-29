ALTER TABLE availability_slots
  ADD COLUMN slot_type VARCHAR(20) NOT NULL DEFAULT 'available'
  CHECK (slot_type IN ('available', 'blocked'));
