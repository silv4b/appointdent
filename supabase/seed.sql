-- ============================================
-- SEED DATA
-- ============================================
-- Senha padrão de todos os usuários: 123456
-- ============================================

-- 1. USUÁRIOS (auth.users)
-- A trigger on_auth_user_created cria os profiles automaticamente
-- Precisamos do raw_app_meta_data com provider para o Auth funcionar
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, confirmation_token, recovery_token, email_change_token_new, email_change_token_current, email_change, phone_change, phone_change_token, reauthentication_token, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'admin@odonto.com',  crypt('123456', gen_salt('bf')), now(), now(), '', '', '', '', '', '', '', '', now(), '{"provider":"email","providers":["email"]}', '{"name":"Admin Odonto"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'dentista@odonto.com', crypt('123456', gen_salt('bf')), now(), now(), '', '', '', '', '', '', '', '', now(), '{"provider":"email","providers":["email"]}', '{"name":"Dr. Carlos"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'secretaria@odonto.com', crypt('123456', gen_salt('bf')), now(), now(), '', '', '', '', '', '', '', '', now(), '{"provider":"email","providers":["email"]}', '{"name":"Maria Secretária"}', now(), now());

-- 2. ATUALIZAR ROLES DOS PROFILES (trigger cria como 'admin' por padrão)
UPDATE profiles SET role = 'admin' WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@odonto.com');
UPDATE profiles SET role = 'dentist' WHERE id = (SELECT id FROM auth.users WHERE email = 'dentista@odonto.com');
UPDATE profiles SET role = 'receptionist' WHERE id = (SELECT id FROM auth.users WHERE email = 'secretaria@odonto.com');

-- 3. DENTISTAS (dados fictícios)
INSERT INTO dentists (id, name, specialty, phone, email) VALUES
  (gen_random_uuid(), 'Dr. João Silva',      'Clínico Geral',     '(11) 99999-0001', 'joao.silva@odontoclub.com'),
  (gen_random_uuid(), 'Dra. Ana Costa',      'Ortodontia',        '(11) 99999-0002', 'ana.costa@odontoclub.com'),
  (gen_random_uuid(), 'Dr. Pedro Oliveira',  'Implantodontia',    '(11) 99999-0003', 'pedro.oliveira@odontoclub.com'),
  (gen_random_uuid(), 'Dra. Mariana Santos', 'Endodontia',        '(11) 99999-0004', 'mariana.santos@odontoclub.com'),
  (gen_random_uuid(), 'Dr. Lucas Mendes',    'Periodontia',       '(11) 99999-0005', 'lucas.mendes@odontoclub.com');

-- 4. PACIENTES (dados fictícios)
INSERT INTO patients (id, name, cpf, phone, birth_date, notes) VALUES
  (gen_random_uuid(), 'Carlos Alberto Souza',   '123.456.789-00', '(11) 98888-0001', '1985-03-15', 'Alergia a anestesia'),
  (gen_random_uuid(), 'Fernanda Lima',          '987.654.321-00', '(11) 98888-0002', '1990-07-22', NULL),
  (gen_random_uuid(), 'Roberto Almeida',        '111.222.333-44', '(11) 98888-0003', '1978-11-08', 'Tem diabetes tipo 2'),
  (gen_random_uuid(), 'Juliana Pereira',        '555.666.777-88', '(11) 98888-0004', '2000-01-30', NULL),
  (gen_random_uuid(), 'Marcos Vinicius Rocha',  '999.888.777-66', '(11) 98888-0005', '1965-09-12', 'Usa anticoagulante'),
  (gen_random_uuid(), 'Patrícia Gomes',         '444.333.222-11', '(11) 98888-0006', '1995-05-18', NULL),
  (gen_random_uuid(), 'Thiago Barbosa',         '777.888.999-00', '(11) 98888-0007', '1988-12-25', 'Sensibilidade nos dentes do fundo'),
  (gen_random_uuid(), 'Amanda Oliveira',        '222.111.333-55', '(11) 98888-0008', '2002-04-05', NULL),
  (gen_random_uuid(), 'Gustavo Henrique Dias',  '666.555.444-33', '(11) 98888-0009', '1970-08-14', 'Bruxismo'),
  (gen_random_uuid(), 'Larissa Cristina Souza', '333.444.555-66', '(11) 98888-0010', '1998-06-20', NULL);

-- 5. PROCEDIMENTOS (serviços odontológicos)
INSERT INTO procedures (id, name, description, duration_minutes, price, color) VALUES
  (gen_random_uuid(), 'Consulta de Rotina',      'Avaliação geral com o dentista',               30,  150.00, '#3b82f6'),
  (gen_random_uuid(), 'Limpeza (Profilaxia)',    'Remoção de tártaro e polimento',              45,  200.00, '#06b6d4'),
  (gen_random_uuid(), 'Restauração (Resina)',    'Obturação com resina composta',                60,  250.00, '#10b981'),
  (gen_random_uuid(), 'Canal (Endodontia)',      'Tratamento de canal',                          90,  800.00, '#f59e0b'),
  (gen_random_uuid(), 'Extração Simples',        'Remoção de dente',                             45,  300.00, '#ef4444'),
  (gen_random_uuid(), 'Clareamento Dental',      'Clareamento a laser',                          60,  600.00, '#8b5cf6'),
  (gen_random_uuid(), 'Aparelho Ortodôntico',    'Colocação de aparelho fixo',                  120, 1500.00, '#ec4899'),
  (gen_random_uuid(), 'Implante Dentário',       'Colocação de implante de titânio',            120, 3500.00, '#14b8a6'),
  (gen_random_uuid(), 'Raio-X Panorâmico',       'Exame de imagem panorâmico',                   15,  120.00, '#6366f1'),
  (gen_random_uuid(), 'Aplicação de Flúor',      'Aplicação tópica de flúor',                    20,   80.00, '#0ea5e9');

-- 6. GRADE DE HORÁRIOS (availability_slots)
-- Seg-Sex 08:00-12:00 e 14:00-18:00 para todos os dentistas
DO $$
DECLARE
  d RECORD;
  dow INT;
BEGIN
  FOR d IN SELECT id FROM dentists LOOP
    FOR dow IN 1..5 LOOP
      INSERT INTO availability_slots (id, dentist_id, day_of_week, start_time, end_time)
      VALUES (gen_random_uuid(), d.id, dow, '08:00', '12:00');
      INSERT INTO availability_slots (id, dentist_id, day_of_week, start_time, end_time)
      VALUES (gen_random_uuid(), d.id, dow, '14:00', '18:00');
    END LOOP;
  END LOOP;
END $$;

-- 7. AGENDAMENTOS (appointments) para hoje
DO $$
DECLARE
  v_patient_id UUID;
  v_dentist_id UUID;
  v_procedure_id UUID;
  v_today DATE := CURRENT_DATE;
  v_start TIMESTAMPTZ;
BEGIN
  -- Consulta de Rotina (30min) - Dr. João Silva com Carlos Alberto
  SELECT id INTO v_patient_id FROM patients WHERE name = 'Carlos Alberto Souza';
  SELECT id INTO v_dentist_id FROM dentists WHERE name = 'Dr. João Silva';
  SELECT id INTO v_procedure_id FROM procedures WHERE name = 'Consulta de Rotina';
  INSERT INTO appointments (patient_id, dentist_id, procedure_id, start_time, end_time, status, notes)
  VALUES (v_patient_id, v_dentist_id, v_procedure_id, v_today + TIME '08:30', v_today + TIME '09:00', 'scheduled', 'Paciente novo');

  -- Limpeza (45min) - Dra. Ana Costa com Fernanda Lima
  SELECT id INTO v_patient_id FROM patients WHERE name = 'Fernanda Lima';
  SELECT id INTO v_dentist_id FROM dentists WHERE name = 'Dra. Ana Costa';
  SELECT id INTO v_procedure_id FROM procedures WHERE name = 'Limpeza (Profilaxia)';
  INSERT INTO appointments (patient_id, dentist_id, procedure_id, start_time, end_time, status, notes)
  VALUES (v_patient_id, v_dentist_id, v_procedure_id, v_today + TIME '09:00', v_today + TIME '09:45', 'confirmed', NULL);

  -- Restauração (60min) - Dr. Pedro Oliveira com Roberto Almeida
  SELECT id INTO v_patient_id FROM patients WHERE name = 'Roberto Almeida';
  SELECT id INTO v_dentist_id FROM dentists WHERE name = 'Dr. Pedro Oliveira';
  SELECT id INTO v_procedure_id FROM procedures WHERE name = 'Restauração (Resina)';
  INSERT INTO appointments (patient_id, dentist_id, procedure_id, start_time, end_time, status, notes)
  VALUES (v_patient_id, v_dentist_id, v_procedure_id, v_today + TIME '10:00', v_today + TIME '11:00', 'scheduled', 'Dente 26');

  -- Raio-X (15min) - Dr. João Silva com Juliana Pereira
  SELECT id INTO v_patient_id FROM patients WHERE name = 'Juliana Pereira';
  SELECT id INTO v_dentist_id FROM dentists WHERE name = 'Dr. João Silva';
  SELECT id INTO v_procedure_id FROM procedures WHERE name = 'Raio-X Panorâmico';
  INSERT INTO appointments (patient_id, dentist_id, procedure_id, start_time, end_time, status, notes)
  VALUES (v_patient_id, v_dentist_id, v_procedure_id, v_today + TIME '11:00', v_today + TIME '11:15', 'scheduled', NULL);

  -- Canal (90min) - Dra. Mariana Santos com Marcos Vinicius Rocha
  SELECT id INTO v_patient_id FROM patients WHERE name = 'Marcos Vinicius Rocha';
  SELECT id INTO v_dentist_id FROM dentists WHERE name = 'Dra. Mariana Santos';
  SELECT id INTO v_procedure_id FROM procedures WHERE name = 'Canal (Endodontia)';
  INSERT INTO appointments (patient_id, dentist_id, procedure_id, start_time, end_time, status, notes)
  VALUES (v_patient_id, v_dentist_id, v_procedure_id, v_today + TIME '14:00', v_today + TIME '15:30', 'scheduled', 'Canal superior direito');

  -- Clareamento (60min) - Dra. Ana Costa com Patrícia Gomes
  SELECT id INTO v_patient_id FROM patients WHERE name = 'Patrícia Gomes';
  SELECT id INTO v_dentist_id FROM dentists WHERE name = 'Dra. Ana Costa';
  SELECT id INTO v_procedure_id FROM procedures WHERE name = 'Clareamento Dental';
  INSERT INTO appointments (patient_id, dentist_id, procedure_id, start_time, end_time, status, notes)
  VALUES (v_patient_id, v_dentist_id, v_procedure_id, v_today + TIME '14:30', v_today + TIME '15:30', 'scheduled', 'Clareamento a laser');
END $$;
