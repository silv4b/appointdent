ALTER TABLE anamnese_sessions
  ADD COLUMN fields JSONB DEFAULT '[]'::jsonb;
