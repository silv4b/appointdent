CREATE TABLE procedure_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id UUID NOT NULL REFERENCES dentists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  price DECIMAL(10, 2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_procedure_requests_status ON procedure_requests(status);
CREATE INDEX idx_procedure_requests_dentist ON procedure_requests(dentist_id);

ALTER TABLE procedure_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dentists can read own requests"
  ON procedure_requests FOR SELECT
  USING (auth.uid() IN (
    SELECT p.id FROM profiles p
    JOIN dentists d ON d.profile_id = p.id
    WHERE d.id = dentist_id
  ) OR auth.uid() IN (
    SELECT p.id FROM profiles p WHERE p.role = 'admin'
  ));

CREATE POLICY "dentists can insert requests"
  ON procedure_requests FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT p.id FROM profiles p
    JOIN dentists d ON d.profile_id = p.id
    WHERE d.id = dentist_id
  ));

CREATE POLICY "admins can update requests"
  ON procedure_requests FOR UPDATE
  USING (auth.uid() IN (
    SELECT p.id FROM profiles p WHERE p.role = 'admin'
  ));
