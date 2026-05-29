CREATE TABLE dentist_procedures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dentist_id UUID NOT NULL REFERENCES dentists(id) ON DELETE CASCADE,
  procedure_id UUID NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
  price DECIMAL(10, 2),
  duration_minutes INTEGER,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (dentist_id, procedure_id)
);

CREATE INDEX idx_dentist_procedures_dentist ON dentist_procedures(dentist_id);

ALTER TABLE dentist_procedures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users can read dentist_procedures"
  ON dentist_procedures FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated users can insert dentist_procedures"
  ON dentist_procedures FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated users can update dentist_procedures"
  ON dentist_procedures FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated users can delete dentist_procedures"
  ON dentist_procedures FOR DELETE USING (auth.role() = 'authenticated');
