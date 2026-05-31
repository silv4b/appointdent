-- ================================================================
-- Criar Administrador — AppointDent
-- ================================================================
-- Uso: Executar no SQL Editor do Supabase após o deploy.
-- A função cria um usuário com email confirmado + profile (role admin).
-- ================================================================

CREATE OR REPLACE FUNCTION criar_admin(
  admin_email TEXT,
  admin_senha TEXT,
  admin_nome  TEXT
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_id uuid;
BEGIN
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
    admin_email, extensions.crypt(admin_senha, extensions.gen_salt('bf')),
    now(), now(),
    '', '', '', '', '', '', '', '', now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('name', admin_nome),
    now(), now()
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    user_id, user_id,
    jsonb_build_object('sub', user_id, 'email', admin_email),
    'email', admin_email,
    now(), now(), now()
  );

  -- O trigger handle_new_user() cria o profile com role 'receptionist'
  -- (padrão atual, migration 00017); aqui forçamos admin
  UPDATE public.profiles SET role = 'admin' WHERE id = user_id;

  RETURN user_id;
END;
$$;

-- ================================================================
-- Exemplo de uso (descomente e edite antes de executar):
-- ================================================================
-- SELECT criar_admin('admin@minha-clinica.com', 'MinhaSenhaForte123', 'Admin da Clínica');

-- O trigger handle_new_user() cria o profile automaticamente,
-- e a função já ajusta a role para 'admin'. Pronto para login.
-- ================================================================
