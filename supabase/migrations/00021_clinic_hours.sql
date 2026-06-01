CREATE TABLE clinic_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time TIME NOT NULL,
  close_time TIME NOT NULL,
  is_open BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_day UNIQUE (day_of_week),
  CONSTRAINT valid_range CHECK (open_time < close_time)
);

INSERT INTO clinic_hours (day_of_week, open_time, close_time, is_open) VALUES
  (0, '00:00', '01:00', false),
  (1, '08:00', '18:00', true),
  (2, '08:00', '18:00', true),
  (3, '08:00', '18:00', true),
  (4, '08:00', '18:00', true),
  (5, '08:00', '18:00', true),
  (6, '08:00', '12:00', true);
