-- ================================================================
-- Fix: RLS policies for receptionist_dentists
-- ================================================================
-- The table was created without RLS policies, blocking all
-- operations by default (Supabase enables RLS on new tables).
-- ================================================================

ALTER TABLE receptionist_dentists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users can select receptionist_dentists"
  ON receptionist_dentists FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated users can insert receptionist_dentists"
  ON receptionist_dentists FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated users can delete receptionist_dentists"
  ON receptionist_dentists FOR DELETE
  USING (auth.role() = 'authenticated');
