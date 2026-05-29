-- ================================================================
-- Admin: Atualizar Usuário
-- ================================================================

CREATE OR REPLACE FUNCTION public.atualizar_usuario(
  usuario_id UUID,
  caller_id UUID,
  usuario_nome TEXT DEFAULT NULL,
  usuario_role TEXT DEFAULT NULL,
  nova_senha TEXT DEFAULT NULL,
  especialidade TEXT DEFAULT NULL,
  novo_email TEXT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, extensions'
AS $$
DECLARE
  caller_role TEXT;
  current_role TEXT;
BEGIN
  SELECT role INTO caller_role FROM public.profiles WHERE id = caller_id;
  IF caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Apenas administradores podem editar usuários';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = usuario_id) THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  SELECT role INTO current_role FROM public.profiles WHERE id = usuario_id;

  IF usuario_nome IS NOT NULL THEN
    UPDATE public.profiles SET name = usuario_nome WHERE id = usuario_id;
  END IF;

  IF usuario_role IS NOT NULL AND usuario_role <> current_role THEN
    IF usuario_role NOT IN ('admin', 'dentist', 'receptionist') THEN
      RAISE EXCEPTION 'Função inválida: %', usuario_role;
    END IF;

    UPDATE public.profiles SET role = usuario_role WHERE id = usuario_id;
  END IF;

  IF especialidade IS NOT NULL THEN
    IF usuario_role = 'dentist' OR current_role = 'dentist' THEN
      IF EXISTS (SELECT 1 FROM public.dentists WHERE profile_id = usuario_id) THEN
        UPDATE public.dentists SET specialty = especialidade WHERE profile_id = usuario_id;
      ELSE
        INSERT INTO public.dentists (profile_id, name, specialty, active)
        VALUES (usuario_id, COALESCE(usuario_nome, (SELECT name FROM public.profiles WHERE id = usuario_id)), especialidade, true);
      END IF;
    END IF;
  END IF;

  IF novo_email IS NOT NULL AND novo_email <> (SELECT email FROM auth.users WHERE id = usuario_id) THEN
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = novo_email AND id <> usuario_id) THEN
      RAISE EXCEPTION 'Email já está em uso por outro usuário';
    END IF;
    UPDATE auth.users SET email = novo_email WHERE id = usuario_id;
  END IF;

  IF nova_senha IS NOT NULL THEN
    UPDATE auth.users
    SET encrypted_password = extensions.crypt(nova_senha, extensions.gen_salt('bf'))
    WHERE id = usuario_id;
  END IF;
END;
$$;
