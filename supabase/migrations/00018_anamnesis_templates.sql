CREATE TABLE anamnesis_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id UUID NOT NULL REFERENCES dentists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_anamnesis_templates_dentist ON anamnesis_templates(dentist_id);

ALTER TABLE anamnesis_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dentistas podem ler seus próprios templates"
  ON anamnesis_templates FOR SELECT
  USING (dentist_id IN (SELECT id FROM public.dentists WHERE profile_id = auth.uid()));

CREATE POLICY "Dentistas podem criar seus próprios templates"
  ON anamnesis_templates FOR INSERT
  WITH CHECK (dentist_id IN (SELECT id FROM public.dentists WHERE profile_id = auth.uid()));

CREATE POLICY "Dentistas podem atualizar seus próprios templates"
  ON anamnesis_templates FOR UPDATE
  USING (dentist_id IN (SELECT id FROM public.dentists WHERE profile_id = auth.uid()));

CREATE POLICY "Dentistas podem excluir seus próprios templates"
  ON anamnesis_templates FOR DELETE
  USING (dentist_id IN (SELECT id FROM public.dentists WHERE profile_id = auth.uid()));
