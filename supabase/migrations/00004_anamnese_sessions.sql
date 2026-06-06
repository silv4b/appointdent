-- Create anamnese_sessions table for dentist notes per appointment
CREATE TABLE anamnese_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  dentist_id UUID NOT NULL REFERENCES dentists(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for quick lookups
CREATE INDEX idx_anamnese_sessions_appointment ON anamnese_sessions(appointment_id);
CREATE INDEX idx_anamnese_sessions_patient ON anamnese_sessions(patient_id);
CREATE INDEX idx_anamnese_sessions_dentist ON anamnese_sessions(dentist_id);

-- Enable RLS
ALTER TABLE anamnese_sessions ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "Todos podem ler anamnese_sessions"
  ON anamnese_sessions FOR SELECT
  TO authenticated
  USING (true);

-- Dentists and admins can insert
CREATE POLICY "Dentistas e admins podem inserir"
  ON anamnese_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'dentist')
  );

-- Dentists can update their own sessions; admins can update any
CREATE POLICY "Dentistas atualizam próprias, admins todas"
  ON anamnese_sessions FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    OR dentist_id IN (
      SELECT id FROM public.dentists WHERE profile_id = auth.uid()
    )
  );

-- Dentists can delete their own sessions; admins can delete any
CREATE POLICY "Dentistas deletam próprias, admins todas"
  ON anamnese_sessions FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    OR dentist_id IN (
      SELECT id FROM public.dentists WHERE profile_id = auth.uid()
    )
  );
