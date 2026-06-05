-- ================================================================
-- Fix: availability_slots RLS — escopo por role
-- ================================================================
-- Antes: qualquer authenticated podia CRUD qualquer slot
-- Depois:
--   Admin: CRUD em todos os slots
--   Dentist: CRUD apenas nos próprios slots
--   Receptionist: CRUD apenas nos slots dos dentistas vinculados
-- ================================================================

DROP POLICY IF EXISTS "authenticated users can read availability slots" ON availability_slots;
DROP POLICY IF EXISTS "authenticated users can insert availability slots" ON availability_slots;
DROP POLICY IF EXISTS "authenticated users can update availability slots" ON availability_slots;
DROP POLICY IF EXISTS "authenticated users can delete availability slots" ON availability_slots;

CREATE POLICY "select availability slots by scope"
  ON availability_slots FOR SELECT
  USING (
    public.get_user_role() = 'admin'
    OR (public.get_user_role() = 'dentist' AND dentist_id IN (SELECT id FROM public.dentists WHERE profile_id = auth.uid()))
    OR (public.get_user_role() = 'receptionist' AND dentist_id IN (SELECT dentist_id FROM public.receptionist_dentists WHERE receptionist_id = auth.uid()))
  );

CREATE POLICY "insert availability slots by scope"
  ON availability_slots FOR INSERT
  WITH CHECK (
    public.get_user_role() = 'admin'
    OR (public.get_user_role() = 'dentist' AND dentist_id IN (SELECT id FROM public.dentists WHERE profile_id = auth.uid()))
    OR (public.get_user_role() = 'receptionist' AND dentist_id IN (SELECT dentist_id FROM public.receptionist_dentists WHERE receptionist_id = auth.uid()))
  );

CREATE POLICY "update availability slots by scope"
  ON availability_slots FOR UPDATE
  USING (
    public.get_user_role() = 'admin'
    OR (public.get_user_role() = 'dentist' AND dentist_id IN (SELECT id FROM public.dentists WHERE profile_id = auth.uid()))
    OR (public.get_user_role() = 'receptionist' AND dentist_id IN (SELECT dentist_id FROM public.receptionist_dentists WHERE receptionist_id = auth.uid()))
  );

CREATE POLICY "delete availability slots by scope"
  ON availability_slots FOR DELETE
  USING (
    public.get_user_role() = 'admin'
    OR (public.get_user_role() = 'dentist' AND dentist_id IN (SELECT id FROM public.dentists WHERE profile_id = auth.uid()))
    OR (public.get_user_role() = 'receptionist' AND dentist_id IN (SELECT dentist_id FROM public.receptionist_dentists WHERE receptionist_id = auth.uid()))
  );
