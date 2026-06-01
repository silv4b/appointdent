ALTER TABLE appointments DROP CONSTRAINT appointments_status_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check CHECK (status IN ('pending', 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled'));

ALTER TABLE appointments DROP CONSTRAINT no_overlap_appointments;
ALTER TABLE appointments ADD CONSTRAINT no_overlap_appointments EXCLUDE USING GIST (
  dentist_id WITH =,
  tstzrange(start_time, end_time) WITH &&
) WHERE (status <> 'cancelled');
