-- ================================================================
-- Fix: RLS policies — escopo por role
-- ================================================================
-- Corrige:
--   1. patients DELETE — qualquer auth pode excluir (sobra da
--      migration 00025 que tentou dropar com nome errado)
--   2. appointments — todas as operações sem escopo por role
--   3. anamnese_sessions — SELECT público (USING true) e INSERT
--      sem verificar vínculo do dentista
--   4. notifications — INSERT permite qualquer user_id
-- ================================================================

-- =====================
-- 1. patients DELETE
-- =====================
-- Remove a policy permissiva que sobrou da migration 00025
-- (o DROP de 00025 usou o nome da 00001, mas a policy ativa
-- tinha o nome da 00002)
DROP POLICY IF EXISTS "anyone can delete patients" ON public.patients;

-- Remove a policy semi-restritiva que permitia dentist deletar
DROP POLICY IF EXISTS "admin or dentist can delete patients" ON public.patients;

-- Apenas admin pode deletar pacientes
CREATE POLICY "admin can delete patients" ON public.patients
  FOR DELETE
  USING (public.get_user_role() = 'admin');

-- =====================
-- 2. appointments
-- =====================
-- Remove todas as policies existentes
DROP POLICY IF EXISTS "anyone can read appointments" ON public.appointments;
DROP POLICY IF EXISTS "anyone can insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "anyone can update appointments" ON public.appointments;
DROP POLICY IF EXISTS "anyone can delete appointments" ON public.appointments;
DROP POLICY IF EXISTS "admin or dentist can delete appointments" ON public.appointments;

-- Helper scope: admin vê tudo, dentista só os próprios,
-- recepcionista só os dos dentistas vinculados
CREATE POLICY "select appointments by scope" ON public.appointments
  FOR SELECT
  USING (
    public.get_user_role() = 'admin'
    OR (public.get_user_role() = 'dentist' AND dentist_id IN (SELECT id FROM public.dentists WHERE profile_id = auth.uid()))
    OR (public.get_user_role() = 'receptionist' AND dentist_id IN (SELECT dentist_id FROM public.receptionist_dentists WHERE receptionist_id = auth.uid()))
  );

CREATE POLICY "insert appointments by scope" ON public.appointments
  FOR INSERT
  WITH CHECK (
    public.get_user_role() = 'admin'
    OR (public.get_user_role() = 'dentist' AND dentist_id IN (SELECT id FROM public.dentists WHERE profile_id = auth.uid()))
    OR (public.get_user_role() = 'receptionist' AND dentist_id IN (SELECT dentist_id FROM public.receptionist_dentists WHERE receptionist_id = auth.uid()))
  );

CREATE POLICY "update appointments by scope" ON public.appointments
  FOR UPDATE
  USING (
    public.get_user_role() = 'admin'
    OR (public.get_user_role() = 'dentist' AND dentist_id IN (SELECT id FROM public.dentists WHERE profile_id = auth.uid()))
    OR (public.get_user_role() = 'receptionist' AND dentist_id IN (SELECT dentist_id FROM public.receptionist_dentists WHERE receptionist_id = auth.uid()))
  )
  WITH CHECK (
    public.get_user_role() = 'admin'
    OR (public.get_user_role() = 'dentist' AND dentist_id IN (SELECT id FROM public.dentists WHERE profile_id = auth.uid()))
    OR (public.get_user_role() = 'receptionist' AND dentist_id IN (SELECT dentist_id FROM public.receptionist_dentists WHERE receptionist_id = auth.uid()))
  );

CREATE POLICY "delete appointments by scope" ON public.appointments
  FOR DELETE
  USING (
    public.get_user_role() = 'admin'
    OR (public.get_user_role() = 'dentist' AND dentist_id IN (SELECT id FROM public.dentists WHERE profile_id = auth.uid()))
    OR (public.get_user_role() = 'receptionist' AND dentist_id IN (SELECT dentist_id FROM public.receptionist_dentists WHERE receptionist_id = auth.uid()))
  );

-- =====================
-- 3. anamnese_sessions
-- =====================
-- Remove SELECT público (USING true)
DROP POLICY IF EXISTS "Todos podem ler anamnese_sessions" ON public.anamnese_sessions;

-- SELECT escopado por role (admin vê tudo, dentista só próprio,
-- recepcionista só dos vinculados)
CREATE POLICY "select anamnese sessions by scope" ON public.anamnese_sessions
  FOR SELECT
  USING (
    public.get_user_role() = 'admin'
    OR (public.get_user_role() = 'dentist' AND dentist_id IN (SELECT id FROM public.dentists WHERE profile_id = auth.uid()))
    OR (public.get_user_role() = 'receptionist' AND dentist_id IN (SELECT dentist_id FROM public.receptionist_dentists WHERE receptionist_id = auth.uid()))
  );

-- INSERT escopado: admin insere para qualquer dentista,
-- dentista só insere para si mesmo
DROP POLICY IF EXISTS "Dentistas e admins podem inserir" ON public.anamnese_sessions;

CREATE POLICY "insert anamnese sessions by scope" ON public.anamnese_sessions
  FOR INSERT
  WITH CHECK (
    public.get_user_role() = 'admin'
    OR (public.get_user_role() = 'dentist' AND dentist_id IN (SELECT id FROM public.dentists WHERE profile_id = auth.uid()))
  );

-- =====================
-- 4. notifications
-- =====================
-- Remove a policy que permite qualquer auth criar notificação
-- para qualquer user_id (fica apenas a restrita por auth.uid())
DROP POLICY IF EXISTS "system can insert notifications" ON public.notifications;
