CREATE TABLE receptionist_dentists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receptionist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dentist_id UUID NOT NULL REFERENCES dentists(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_receptionist_dentist UNIQUE (receptionist_id, dentist_id)
);

CREATE INDEX idx_receptionist_dentists_receptionist ON receptionist_dentists(receptionist_id);
CREATE INDEX idx_receptionist_dentists_dentist ON receptionist_dentists(dentist_id);
