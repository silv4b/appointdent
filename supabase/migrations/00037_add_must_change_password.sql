-- Add must_change_password column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

-- Update criar_usuario RPC to set must_change_password = true for new users
CREATE OR REPLACE FUNCTION public.criar_usuario(
  usuario_email TEXT,
  usuario_senha TEXT,
  usuario_nome  TEXT,
  usuario_role  TEXT,
  especialidade TEXT DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, extensions'
AS $$
DECLARE
  caller_role TEXT;
  user_id uuid;
  existing_id uuid;
BEGIN
  SELECT p.role INTO caller_role FROM public.profiles p WHERE p.id = auth.uid();
  IF caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Apenas administradores podem criar usuários';
  END IF;

  IF usuario_role NOT IN ('admin', 'dentist', 'receptionist') THEN
    RAISE EXCEPTION 'Função inválida: %', usuario_role;
  END IF;

  SELECT u.id INTO existing_id FROM auth.users u WHERE u.email = usuario_email;
  IF existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'Já existe um usuário com este email';
  END IF;

  user_id := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_sent_at,
    confirmation_token, recovery_token, email_change_token_new,
    email_change_token_current, email_change, phone_change,
    phone_change_token, reauthentication_token, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', user_id,
    'authenticated', 'authenticated',
    usuario_email, extensions.crypt(usuario_senha, extensions.gen_salt('bf')),
    now(), now(),
    '', '', '', '', '', '', '', '', now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('name', usuario_nome),
    now(), now()
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    user_id, user_id,
    jsonb_build_object('sub', user_id, 'email', usuario_email),
    'email', usuario_email,
    now(), now(), now()
  );

  UPDATE public.profiles SET
    role = usuario_role,
    must_change_password = true
  WHERE id = user_id;

  IF usuario_role = 'dentist' THEN
    INSERT INTO public.dentists (profile_id, name, specialty, active)
    VALUES (user_id, usuario_nome, COALESCE(especialidade, ''), true);
  END IF;

  RETURN user_id;
END;
$$;
