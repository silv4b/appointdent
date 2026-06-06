-- ============================================
-- Seed: usuário administrador padrão
-- ============================================
-- Email:    admin@appointdent.com
-- Senha:    Admin@123456
-- ============================================
-- Altere a senha após o primeiro login.
-- Para criar outro admin, use o script em supabase/criar-admin.sql
-- ============================================

DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'admin@appointdent.com';
BEGIN
  -- Só cria se ainda não existir
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    -- 1. Criar usuário em auth.users
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current, reauthentication_token, is_sso_user, is_anonymous)
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      v_email,
      extensions.crypt('Admin@123456', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('name', 'Administrador'),
      now(),
      now(),
      '', '', '', '', '', '',
      false, false
    )
    RETURNING id INTO v_user_id;

    -- 2. Criar identity (necessária para login email/senha)
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      v_user_id,
      v_user_id,
      jsonb_build_object('sub', v_user_id, 'email', v_email),
      'email',
      v_email,
      now(),
      now(),
      now()
    );

    -- 3. Promover para admin (trigger cria como 'receptionist')
    UPDATE public.profiles
    SET role = 'admin'
    WHERE id = v_user_id;
  END IF;
END;
$$;
