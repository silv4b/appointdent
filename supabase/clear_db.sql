-- ================================================================
-- Clear Database — AppointDent
-- ================================================================
-- Remove TODOS os dados da aplicação, incluindo administradores.
-- Após executar, use criar-admin.sql para recriar o admin.
-- ================================================================

BEGIN;

-- Desativa verificações de FK para truncar em qualquer ordem
SET session_replication_role = 'replica';

-- Limpa todas as tabelas da aplicação
-- (profiles será deletado via CASCADE de auth.users)
TRUNCATE TABLE
  anamnese_sessions,
  anamnesis_templates,
  appointments,
  availability_slots,
  blocked_slots,
  clinic_hours,
  dentist_procedures,
  procedure_requests,
  receptionist_dentists,
  notifications,
  dentists,
  patients,
  procedures
CASCADE;

-- Reativa verificações de FK
SET session_replication_role = 'origin';

-- Remove todos os usuários (cascade deleta profiles + auth.identities + sessões)
DELETE FROM auth.users;

COMMIT;
