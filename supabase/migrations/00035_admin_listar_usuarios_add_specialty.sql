DROP FUNCTION IF EXISTS public.listar_usuarios;

CREATE FUNCTION public.listar_usuarios(
  page_size INT DEFAULT 20,
  page_num  INT DEFAULT 1,
  caller_id UUID DEFAULT NULL
) RETURNS TABLE (
  id uuid,
  name TEXT,
  email TEXT,
  role TEXT,
  dentist_id uuid,
  specialty TEXT,
  created_at TIMESTAMPTZ,
  total BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, extensions'
AS $$
DECLARE
  caller_role TEXT;
  v_total BIGINT;
  v_offset INT;
  v_caller UUID;
BEGIN
  v_caller := COALESCE(caller_id, auth.uid());

  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT p.role INTO caller_role FROM public.profiles p WHERE p.id = v_caller;
  IF caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Apenas administradores podem listar usuários';
  END IF;

  SELECT COUNT(*)::BIGINT INTO v_total FROM public.profiles;

  v_offset := (page_num - 1) * page_size;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    u.email::TEXT,
    p.role,
    d.id AS dentist_id,
    d.specialty,
    p.created_at,
    v_total
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  LEFT JOIN public.dentists d ON d.profile_id = p.id
  ORDER BY p.created_at DESC
  LIMIT page_size
  OFFSET v_offset;
END;
$$;
