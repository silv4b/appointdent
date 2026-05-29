-- ============================================
-- SEED DATA
-- ============================================
-- Senha padrão de todos os usuários: 123456
-- ============================================

-- 1. USUÁRIOS (auth.users)
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, confirmation_token, recovery_token, email_change_token_new, email_change_token_current, email_change, phone_change, phone_change_token, reauthentication_token, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'admin@odonto.com',  crypt('123456', gen_salt('bf')), now(), now(), '', '', '', '', '', '', '', '', now(), '{"provider":"email","providers":["email"]}', '{"name":"Admin Odonto"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'secretaria@odonto.com', crypt('123456', gen_salt('bf')), now(), now(), '', '', '', '', '', '', '', '', now(), '{"provider":"email","providers":["email"]}', '{"name":"Maria Secretária"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'dentista1@odonto.com', crypt('123456', gen_salt('bf')), now(), now(), '', '', '', '', '', '', '', '', now(), '{"provider":"email","providers":["email"]}', '{"name":"Dr. João Silva"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'dentista2@odonto.com', crypt('123456', gen_salt('bf')), now(), now(), '', '', '', '', '', '', '', '', now(), '{"provider":"email","providers":["email"]}', '{"name":"Dra. Ana Costa"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'dentista3@odonto.com', crypt('123456', gen_salt('bf')), now(), now(), '', '', '', '', '', '', '', '', now(), '{"provider":"email","providers":["email"]}', '{"name":"Dr. Pedro Oliveira"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'dentista4@odonto.com', crypt('123456', gen_salt('bf')), now(), now(), '', '', '', '', '', '', '', '', now(), '{"provider":"email","providers":["email"]}', '{"name":"Dra. Mariana Santos"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'dentista5@odonto.com', crypt('123456', gen_salt('bf')), now(), now(), '', '', '', '', '', '', '', '', now(), '{"provider":"email","providers":["email"]}', '{"name":"Dr. Lucas Mendes"}', now(), now());

-- 2. ATUALIZAR ROLES DOS PROFILES (trigger cria como 'admin' por padrão)
UPDATE profiles SET role = 'admin' WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@odonto.com');
UPDATE profiles SET role = 'receptionist' WHERE id = (SELECT id FROM auth.users WHERE email = 'secretaria@odonto.com');
UPDATE profiles SET role = 'dentist' WHERE id = (SELECT id FROM auth.users WHERE email = 'dentista1@odonto.com');
UPDATE profiles SET role = 'dentist' WHERE id = (SELECT id FROM auth.users WHERE email = 'dentista2@odonto.com');
UPDATE profiles SET role = 'dentist' WHERE id = (SELECT id FROM auth.users WHERE email = 'dentista3@odonto.com');
UPDATE profiles SET role = 'dentist' WHERE id = (SELECT id FROM auth.users WHERE email = 'dentista4@odonto.com');
UPDATE profiles SET role = 'dentist' WHERE id = (SELECT id FROM auth.users WHERE email = 'dentista5@odonto.com');

-- 3. DENTISTAS (com profile_id vinculado ao auth user)
INSERT INTO dentists (id, profile_id, name, specialty, phone, email) VALUES
  (gen_random_uuid(), (SELECT id FROM auth.users WHERE email = 'dentista1@odonto.com'), 'Dr. João Silva',      'Clínico Geral',     '(11) 99999-0001', 'joao.silva@odontoclub.com'),
  (gen_random_uuid(), (SELECT id FROM auth.users WHERE email = 'dentista2@odonto.com'), 'Dra. Ana Costa',      'Ortodontia',        '(11) 99999-0002', 'ana.costa@odontoclub.com'),
  (gen_random_uuid(), (SELECT id FROM auth.users WHERE email = 'dentista3@odonto.com'), 'Dr. Pedro Oliveira',  'Implantodontia',    '(11) 99999-0003', 'pedro.oliveira@odontoclub.com'),
  (gen_random_uuid(), (SELECT id FROM auth.users WHERE email = 'dentista4@odonto.com'), 'Dra. Mariana Santos', 'Endodontia',        '(11) 99999-0004', 'mariana.santos@odontoclub.com'),
  (gen_random_uuid(), (SELECT id FROM auth.users WHERE email = 'dentista5@odonto.com'), 'Dr. Lucas Mendes',    'Periodontia',       '(11) 99999-0005', 'lucas.mendes@odontoclub.com');

-- 4. PACIENTES (30 pacientes)
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
  (gen_random_uuid(), 'Larissa Cristina Souza', '333.444.555-66', '(11) 98888-0010', '1998-06-20', NULL),
  (gen_random_uuid(), 'Bruno Oliveira Santos',  '123.456.789-11', '(11) 98888-0011', '1992-09-10', NULL),
  (gen_random_uuid(), 'Carla Mendes Rocha',     '123.456.789-22', '(11) 98888-0012', '1987-04-25', 'Gestante'),
  (gen_random_uuid(), 'Diego Souza Martins',    '123.456.789-33', '(11) 98888-0013', '1975-12-02', 'Hipertenso'),
  (gen_random_uuid(), 'Elaine Cristina Faria',  '123.456.789-44', '(11) 98888-0014', '2001-08-15', NULL),
  (gen_random_uuid(), 'Fábio Henrique Lopes',   '123.456.789-55', '(11) 98888-0015', '1982-03-30', NULL),
  (gen_random_uuid(), 'Gabriela Nunes Costa',   '123.456.789-66', '(11) 98888-0016', '1996-11-18', 'Aparelho ortodôntico'),
  (gen_random_uuid(), 'Hugo Leonardo Pereira',  '123.456.789-77', '(11) 98888-0017', '1960-07-05', 'Usa marcapasso'),
  (gen_random_uuid(), 'Isabela Torres Alves',   '123.456.789-88', '(11) 98888-0018', '1993-02-28', NULL),
  (gen_random_uuid(), 'João Victor Campos',      '123.456.789-99', '(11) 98888-0019', '2005-06-12', 'Menor de idade'),
  (gen_random_uuid(), 'Karine Dias Barbosa',    '223.456.789-00', '(11) 98888-0020', '1989-10-08', NULL),
  (gen_random_uuid(), 'Leonardo Santos Neves',  '323.456.789-11', '(11) 98888-0021', '1972-01-20', 'Tabagista'),
  (gen_random_uuid(), 'Michele Aparecida Lima', '423.456.789-22', '(11) 98888-0022', '1997-05-30', NULL),
  (gen_random_uuid(), 'Nelson Ferreira Cruz',   '523.456.789-33', '(11) 98888-0023', '1968-09-14', 'Alergia a anti-inflamatórios'),
  (gen_random_uuid(), 'Olivia Barbosa Rocha',   '623.456.789-44', '(11) 98888-0024', '2003-12-01', NULL),
  (gen_random_uuid(), 'Paulo Henrique Alves',   '723.456.789-55', '(11) 98888-0025', '1980-04-22', NULL),
  (gen_random_uuid(), 'Renata Cristina Moura',  '823.456.789-66', '(11) 98888-0026', '1991-08-05', 'Enxaqueca frequente'),
  (gen_random_uuid(), 'Sérgio Augusto Castro',  '923.456.789-77', '(11) 98888-0027', '1976-11-30', NULL),
  (gen_random_uuid(), 'Tatiane Oliveira Santos','033.456.789-88', '(11) 98888-0028', '1999-03-15', NULL),
  (gen_random_uuid(), 'Ulysses Teixeira Neto',  '133.456.789-99', '(11) 98888-0029', '1955-07-18', 'Próteses existentes'),
  (gen_random_uuid(), 'Vitória Campos Lima',    '233.456.789-00', '(11) 98888-0030', '2004-09-25', NULL);

-- 5. PROCEDIMENTOS (serviços odontológicos) — mesma lista
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

-- 6. GRADE DE HORÁRIOS (availability_slots) — escalas diferentes por dentista
DO $$
DECLARE
  v_dent1 UUID; v_dent2 UUID; v_dent3 UUID; v_dent4 UUID; v_dent5 UUID;
  dow INT;
BEGIN
  SELECT id INTO v_dent1 FROM dentists WHERE name = 'Dr. João Silva';
  SELECT id INTO v_dent2 FROM dentists WHERE name = 'Dra. Ana Costa';
  SELECT id INTO v_dent3 FROM dentists WHERE name = 'Dr. Pedro Oliveira';
  SELECT id INTO v_dent4 FROM dentists WHERE name = 'Dra. Mariana Santos';
  SELECT id INTO v_dent5 FROM dentists WHERE name = 'Dr. Lucas Mendes';

  -- Dr. João Silva: Seg-Sex 08:00-12:00 e 14:00-18:00
  FOR dow IN 1..5 LOOP
    INSERT INTO availability_slots VALUES (gen_random_uuid(), v_dent1, dow, '08:00', '12:00');
    INSERT INTO availability_slots VALUES (gen_random_uuid(), v_dent1, dow, '14:00', '18:00');
  END LOOP;

  -- Dra. Ana Costa: Seg-Qua 08:00-12:00 e 13:00-17:00; Qui-Sex 08:00-13:00
  FOR dow IN 1..3 LOOP
    INSERT INTO availability_slots VALUES (gen_random_uuid(), v_dent2, dow, '08:00', '12:00');
    INSERT INTO availability_slots VALUES (gen_random_uuid(), v_dent2, dow, '13:00', '17:00');
  END LOOP;
  FOR dow IN 4..5 LOOP
    INSERT INTO availability_slots VALUES (gen_random_uuid(), v_dent2, dow, '08:00', '13:00');
  END LOOP;

  -- Dr. Pedro Oliveira: Seg-Sex 09:00-13:00 e 15:00-19:00
  FOR dow IN 1..5 LOOP
    INSERT INTO availability_slots VALUES (gen_random_uuid(), v_dent3, dow, '09:00', '13:00');
    INSERT INTO availability_slots VALUES (gen_random_uuid(), v_dent3, dow, '15:00', '19:00');
  END LOOP;

  -- Dra. Mariana Santos: Ter-Sáb 08:00-12:00 e 14:00-18:00
  FOR dow IN 2..6 LOOP
    INSERT INTO availability_slots VALUES (gen_random_uuid(), v_dent4, dow, '08:00', '12:00');
    INSERT INTO availability_slots VALUES (gen_random_uuid(), v_dent4, dow, '14:00', '18:00');
  END LOOP;

  -- Dr. Lucas Mendes: Seg-Sex 08:00-12:00 e 14:00-18:00
  FOR dow IN 1..5 LOOP
    INSERT INTO availability_slots VALUES (gen_random_uuid(), v_dent5, dow, '08:00', '12:00');
    INSERT INTO availability_slots VALUES (gen_random_uuid(), v_dent5, dow, '14:00', '18:00');
  END LOOP;
END $$;

-- 7. AGENDAMENTOS (appointments) — 12 por dentista, sem overlaps
DO $$
DECLARE
  d_ids UUID[]; p_ids UUID[]; pr_ids UUID[];
  d_id UUID; p_id UUID; pr_id UUID;
  day_offset INT; slot_start TIMESTAMPTZ; slot_end TIMESTAMPTZ;
  dur INT; st TEXT; i INT; attempts INT;
  used tstzrange[];
  statuses TEXT[] := ARRAY['scheduled', 'confirmed', 'completed', 'completed', 'completed', 'completed', 'cancelled'];
  hours INT[] := ARRAY[8, 9, 10, 11, 14, 15, 16];
BEGIN
  SELECT ARRAY(SELECT id FROM patients ORDER BY name) INTO p_ids;
  SELECT ARRAY(SELECT id FROM dentists ORDER BY name) INTO d_ids;
  SELECT ARRAY(SELECT id FROM procedures ORDER BY name) INTO pr_ids;

  FOREACH d_id IN ARRAY d_ids LOOP
    used := ARRAY[]::tstzrange[];
    i := 0;

    WHILE i < 12 LOOP
      attempts := 0;

      <<find_slot>>
      LOOP
        attempts := attempts + 1;
        IF attempts > 200 THEN EXIT find_slot; END IF;

        p_id := p_ids[1 + floor(random() * array_length(p_ids, 1))::int];
        pr_id := pr_ids[1 + floor(random() * array_length(pr_ids, 1))::int];

        day_offset := -30 + floor(random() * 61)::int;
        IF EXTRACT(DOW FROM CURRENT_DATE + day_offset) = 0 THEN
          day_offset := day_offset + 1;
        END IF;

        slot_start := (CURRENT_DATE + day_offset)
          + (hours[1 + floor(random() * array_length(hours, 1))::int]::TEXT || ':00')::TIME;
        dur := (ARRAY[30, 45, 60])[1 + floor(random() * 3)::int];
        slot_end := slot_start + (dur || ' minutes')::INTERVAL;

        IF NOT EXISTS (SELECT 1 FROM unnest(used) r WHERE r && tstzrange(slot_start, slot_end)) THEN
          used := array_append(used, tstzrange(slot_start, slot_end));
          EXIT find_slot;
        END IF;
      END LOOP;

      IF attempts > 200 THEN EXIT; END IF;

      IF day_offset < 0 THEN
        st := statuses[1 + floor(random() * 7)::int];
      ELSE
        st := statuses[1 + floor(random() * 2)::int];
      END IF;

      INSERT INTO appointments (patient_id, dentist_id, procedure_id, start_time, end_time, status, notes)
      VALUES (p_id, d_id, pr_id, slot_start, slot_end, st,
        CASE WHEN random() < 0.3 THEN 'Observação gerada automaticamente para demonstração.' ELSE NULL END
      );

      i := i + 1;
    END LOOP;
  END LOOP;
END $$;

-- 8. SOLICITAÇÕES DE PROCEDIMENTOS (procedure_requests)
DO $$
DECLARE
  v_dent2 UUID; v_dent3 UUID; v_dent4 UUID; v_dent5 UUID;
  v_admin UUID;
BEGIN
  SELECT id INTO v_dent2 FROM dentists WHERE name = 'Dra. Ana Costa';
  SELECT id INTO v_dent3 FROM dentists WHERE name = 'Dr. Pedro Oliveira';
  SELECT id INTO v_dent4 FROM dentists WHERE name = 'Dra. Mariana Santos';
  SELECT id INTO v_dent5 FROM dentists WHERE name = 'Dr. Lucas Mendes';
  SELECT id INTO v_admin FROM auth.users WHERE email = 'admin@odonto.com';

  -- Pendentes (3)
  INSERT INTO procedure_requests (dentist_id, name, description, duration_minutes, price, status)
  VALUES
    (v_dent2, 'Lente de Contato Dental', 'Aplicação de lentes de porcelana para correção estética', 90, 1800.00, 'pending'),
    (v_dent3, 'Bichectomia', 'Remoção cirúrgica das bolsas de Bichat', 60, 2500.00, 'pending'),
    (v_dent5, 'Toxina Botulínica (Botox)', 'Aplicação de toxina botulínica para fins terapêuticos e estéticos', 30, 800.00, 'pending');

  -- Aprovadas (2)
  INSERT INTO procedure_requests (dentist_id, name, description, duration_minutes, price, status, admin_id, reviewed_at)
  VALUES
    (v_dent4, 'Odontopediatria - Selante', 'Aplicação de selante em dentes infantis', 40, 120.00, 'approved', v_admin, now() - interval '5 days'),
    (v_dent3, 'Enxerto Ósseo', 'Enxerto ósseo para preparação de implante', 90, 2000.00, 'approved', v_admin, now() - interval '2 days');

  -- Rejeitadas (2)
  INSERT INTO procedure_requests (dentist_id, name, description, duration_minutes, price, status, admin_id, reviewed_at, rejection_reason)
  VALUES
    (v_dent2, 'Harmonização Facial', 'Procedimento estético facial completo', 120, 3500.00, 'rejected', v_admin, now() - interval '7 days', 'Fora do escopo de atendimento da clínica'),
    (v_dent5, 'Tratamento com Plasma Rico em Plaquetas', 'Aplicação de PRP para regeneração periodontal', 60, 1200.00, 'rejected', v_admin, now() - interval '3 days', 'Equipamento necessário não disponível');
END $$;
