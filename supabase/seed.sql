-- ============================================
-- SEED DATA — AppointDent
-- ============================================
-- Senha padrão: 123456
-- Email convention: tipoN@odonto.com
--   admin@odonto.com (admin)
--   mariarecepcao@odonto.com, anapaularecepcao@odonto.com
--   joaosilva@odonto.com ... lucasmendes@odonto.com
-- ============================================

-- 1. USUÁRIOS (auth.users)
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_sent_at, confirmation_token, recovery_token, email_change_token_new, email_change_token_current, email_change, phone_change, phone_change_token, reauthentication_token, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', email, extensions.crypt('123456', extensions.gen_salt('bf')), now(), now(), '', '', '', '', '', '', '', '', now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('name', nome), now(), now()
FROM (VALUES
  ('admin@odonto.com',              'Admin Odonto'),
  ('mariarecepcao@odonto.com',     'Maria de Andrade'),
  ('anapaularecepcao@odonto.com',     'Ana Paula Souza'),
  ('joaosilva@odonto.com',          'Dr. João Silva'),
  ('anacosta@odonto.com',          'Dra. Ana Costa'),
  ('pedrooliveira@odonto.com',          'Dr. Pedro Oliveira'),
  ('marianasantos@odonto.com',          'Dra. Mariana Santos'),
  ('lucasmendes@odonto.com',          'Dr. Lucas Mendes')
) AS u(email, nome);

-- 1b. IDENTITIES (necessário para login email/senha no Supabase)
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
SELECT id, id, jsonb_build_object('sub', id, 'email', email), 'email', email, now(), now(), now()
FROM auth.users
ON CONFLICT DO NOTHING;

-- 2. ATUALIZAR ROLES DOS PROFILES (trigger cria como 'receptionist' por padrão)
UPDATE profiles SET role = 'admin'        WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@odonto.com');
UPDATE profiles SET role = 'receptionist' WHERE id = (SELECT id FROM auth.users WHERE email = 'mariarecepcao@odonto.com');
UPDATE profiles SET role = 'receptionist' WHERE id = (SELECT id FROM auth.users WHERE email = 'anapaularecepcao@odonto.com');
UPDATE profiles SET role = 'dentist'      WHERE id = (SELECT id FROM auth.users WHERE email = 'joaosilva@odonto.com');
UPDATE profiles SET role = 'dentist'      WHERE id = (SELECT id FROM auth.users WHERE email = 'anacosta@odonto.com');
UPDATE profiles SET role = 'dentist'      WHERE id = (SELECT id FROM auth.users WHERE email = 'pedrooliveira@odonto.com');
UPDATE profiles SET role = 'dentist'      WHERE id = (SELECT id FROM auth.users WHERE email = 'marianasantos@odonto.com');
UPDATE profiles SET role = 'dentist'      WHERE id = (SELECT id FROM auth.users WHERE email = 'lucasmendes@odonto.com');

-- 3. DENTISTAS
INSERT INTO dentists (id, profile_id, name, specialty, phone, email) VALUES
  (gen_random_uuid(), (SELECT id FROM auth.users WHERE email = 'joaosilva@odonto.com'), 'Dr. João Silva',      'Clínico Geral',     '(11) 99999-0001', 'joao.silva@odontoclub.com'),
  (gen_random_uuid(), (SELECT id FROM auth.users WHERE email = 'anacosta@odonto.com'), 'Dra. Ana Costa',      'Ortodontia',        '(11) 99999-0002', 'ana.costa@odontoclub.com'),
  (gen_random_uuid(), (SELECT id FROM auth.users WHERE email = 'pedrooliveira@odonto.com'), 'Dr. Pedro Oliveira',  'Implantodontia',    '(11) 99999-0003', 'pedro.oliveira@odontoclub.com'),
  (gen_random_uuid(), (SELECT id FROM auth.users WHERE email = 'marianasantos@odonto.com'), 'Dra. Mariana Santos', 'Endodontia',        '(11) 99999-0004', 'mariana.santos@odontoclub.com'),
  (gen_random_uuid(), (SELECT id FROM auth.users WHERE email = 'lucasmendes@odonto.com'), 'Dr. Lucas Mendes',    'Periodontia',       '(11) 99999-0005', 'lucas.mendes@odontoclub.com');

-- 4. PACIENTES (100 pacientes)
INSERT INTO patients (id, name, cpf, phone, birth_date, notes) VALUES
  (gen_random_uuid(), 'Carlos Alberto Souza',       '123.456.789-00', '(11) 98888-0001', '1985-03-15', 'Alergia a anestesia'),
  (gen_random_uuid(), 'Fernanda Lima',              '987.654.321-00', '(11) 98888-0002', '1990-07-22', NULL),
  (gen_random_uuid(), 'Roberto Almeida',            '111.222.333-44', '(11) 98888-0003', '1978-11-08', 'Diabetes tipo 2'),
  (gen_random_uuid(), 'Juliana Pereira',            '555.666.777-88', '(11) 98888-0004', '2000-01-30', NULL),
  (gen_random_uuid(), 'Marcos Vinicius Rocha',      '999.888.777-66', '(11) 98888-0005', '1965-09-12', 'Usa anticoagulante'),
  (gen_random_uuid(), 'Patrícia Gomes',             '444.333.222-11', '(11) 98888-0006', '1995-05-18', NULL),
  (gen_random_uuid(), 'Thiago Barbosa',             '777.888.999-00', '(11) 98888-0007', '1988-12-25', 'Sensibilidade nos dentes do fundo'),
  (gen_random_uuid(), 'Amanda Oliveira',            '222.111.333-55', '(11) 98888-0008', '2002-04-05', NULL),
  (gen_random_uuid(), 'Gustavo Henrique Dias',      '666.555.444-33', '(11) 98888-0009', '1970-08-14', 'Bruxismo'),
  (gen_random_uuid(), 'Larissa Cristina Souza',     '333.444.555-66', '(11) 98888-0010', '1998-06-20', NULL),
  (gen_random_uuid(), 'Bruno Oliveira Santos',      '123.456.789-11', '(11) 98888-0011', '1992-09-10', NULL),
  (gen_random_uuid(), 'Carla Mendes Rocha',         '123.456.789-22', '(11) 98888-0012', '1987-04-25', 'Gestante'),
  (gen_random_uuid(), 'Diego Souza Martins',        '123.456.789-33', '(11) 98888-0013', '1975-12-02', 'Hipertenso'),
  (gen_random_uuid(), 'Elaine Cristina Faria',      '123.456.789-44', '(11) 98888-0014', '2001-08-15', NULL),
  (gen_random_uuid(), 'Fábio Henrique Lopes',       '123.456.789-55', '(11) 98888-0015', '1982-03-30', NULL),
  (gen_random_uuid(), 'Gabriela Nunes Costa',       '123.456.789-66', '(11) 98888-0016', '1996-11-18', 'Aparelho ortodôntico'),
  (gen_random_uuid(), 'Hugo Leonardo Pereira',      '123.456.789-77', '(11) 98888-0017', '1960-07-05', 'Usa marcapasso'),
  (gen_random_uuid(), 'Isabela Torres Alves',       '123.456.789-88', '(11) 98888-0018', '1993-02-28', NULL),
  (gen_random_uuid(), 'João Victor Campos',          '123.456.789-99', '(11) 98888-0019', '2005-06-12', 'Menor de idade'),
  (gen_random_uuid(), 'Karine Dias Barbosa',        '223.456.789-00', '(11) 98888-0020', '1989-10-08', NULL),
  (gen_random_uuid(), 'Leonardo Santos Neves',      '323.456.789-11', '(11) 98888-0021', '1972-01-20', 'Tabagista'),
  (gen_random_uuid(), 'Michele Aparecida Lima',     '423.456.789-22', '(11) 98888-0022', '1997-05-30', NULL),
  (gen_random_uuid(), 'Nelson Ferreira Cruz',       '523.456.789-33', '(11) 98888-0023', '1968-09-14', 'Alergia a anti-inflamatórios'),
  (gen_random_uuid(), 'Olivia Barbosa Rocha',       '623.456.789-44', '(11) 98888-0024', '2003-12-01', NULL),
  (gen_random_uuid(), 'Paulo Henrique Alves',       '723.456.789-55', '(11) 98888-0025', '1980-04-22', NULL),
  (gen_random_uuid(), 'Renata Cristina Moura',      '823.456.789-66', '(11) 98888-0026', '1991-08-05', 'Enxaqueca frequente'),
  (gen_random_uuid(), 'Sérgio Augusto Castro',      '923.456.789-77', '(11) 98888-0027', '1976-11-30', NULL),
  (gen_random_uuid(), 'Tatiane Oliveira Santos',    '033.456.789-88', '(11) 98888-0028', '1999-03-15', NULL),
  (gen_random_uuid(), 'Ulysses Teixeira Neto',      '133.456.789-99', '(11) 98888-0029', '1955-07-18', 'Próteses existentes'),
  (gen_random_uuid(), 'Vitória Campos Lima',        '233.456.789-00', '(11) 98888-0030', '2004-09-25', NULL),
  (gen_random_uuid(), 'Adriana Santos Barbosa',     '333.456.789-01', '(11) 98888-0031', '1983-02-14', NULL),
  (gen_random_uuid(), 'Bianca Rodrigues Alves',     '433.456.789-02', '(11) 98888-0032', '1994-06-28', 'Ansiedade'),
  (gen_random_uuid(), 'Caio Fernando Lima',         '533.456.789-03', '(11) 98888-0033', '1986-10-05', NULL),
  (gen_random_uuid(), 'Débora Cristina Nunes',      '633.456.789-04', '(11) 98888-0034', '2001-12-19', NULL),
  (gen_random_uuid(), 'Eduardo Almeida Neto',       '733.456.789-05', '(11) 98888-0035', '1979-04-11', 'Refluxo'),
  (gen_random_uuid(), 'Fernanda Castro Lopes',      '833.456.789-06', '(11) 98888-0036', '1997-08-23', NULL),
  (gen_random_uuid(), 'Gabriel Oliveira Rocha',     '933.456.789-07', '(11) 98888-0037', '2000-11-30', NULL),
  (gen_random_uuid(), 'Helena Martins Costa',       '043.456.789-08', '(11) 98888-0038', '1988-03-17', 'Alergia a látex'),
  (gen_random_uuid(), 'Igor Nascimento Pereira',    '143.456.789-09', '(11) 98888-0039', '1973-07-09', NULL),
  (gen_random_uuid(), 'Jéssica Oliveira Santos',    '243.456.789-10', '(11) 98888-0040', '1995-09-15', NULL),
  (gen_random_uuid(), 'Kevin Barbosa Silva',        '343.456.789-11', '(11) 98888-0041', '2002-01-22', 'Asma'),
  (gen_random_uuid(), 'Letícia Ramos Dias',         '443.456.789-12', '(11) 98888-0042', '1991-05-04', NULL),
  (gen_random_uuid(), 'Mateus Oliveira Cruz',       '543.456.789-13', '(11) 98888-0043', '1984-10-18', NULL),
  (gen_random_uuid(), 'Natália Souza Lima',         '643.456.789-14', '(11) 98888-0044', '1999-02-26', 'Tontura frequente'),
  (gen_random_uuid(), 'Otávio Rocha Mendes',        '743.456.789-15', '(11) 98888-0045', '1971-06-12', NULL),
  (gen_random_uuid(), 'Priscila Alves Torres',      '843.456.789-16', '(11) 98888-0046', '1993-12-08', NULL),
  (gen_random_uuid(), 'Rafael Costa Barbosa',       '943.456.789-17', '(11) 98888-0047', '2004-08-20', 'Menor de idade'),
  (gen_random_uuid(), 'Sabrina Gonçalves Faria',    '053.456.789-18', '(11) 98888-0048', '1987-04-03', NULL),
  (gen_random_uuid(), 'Thiago Oliveira Lopes',      '153.456.789-19', '(11) 98888-0049', '1976-09-27', 'Hipertenso'),
  (gen_random_uuid(), 'Andressa Moraes Silva',      '253.456.789-20', '(11) 98888-0050', '2003-11-14', NULL),
  (gen_random_uuid(), 'Bruno Henrique Costa',       '353.456.789-21', '(11) 98888-0051', '1980-01-30', 'Tabagista'),
  (gen_random_uuid(), 'Camila Rodrigues Souza',     '453.456.789-22', '(11) 98888-0052', '1996-05-16', NULL),
  (gen_random_uuid(), 'Daniel Oliveira Barbosa',    '553.456.789-23', '(11) 98888-0053', '1989-08-05', NULL),
  (gen_random_uuid(), 'Estela Martins Nunes',       '653.456.789-24', '(11) 98888-0054', '2001-03-22', 'Uso de aparelho fixo'),
  (gen_random_uuid(), 'Felipe Augusto Dias',        '753.456.789-25', '(11) 98888-0055', '1974-12-11', NULL),
  (gen_random_uuid(), 'Giovanna Lima Santos',       '853.456.789-26', '(11) 98888-0056', '1998-07-29', NULL),
  (gen_random_uuid(), 'Henrique Alves Pereira',     '953.456.789-27', '(11) 98888-0057', '1982-10-03', 'Bronquite'),
  (gen_random_uuid(), 'Isabel Cristina Rocha',      '063.456.789-28', '(11) 98888-0058', '1992-02-18', NULL),
  (gen_random_uuid(), 'Jorge Luiz Campos',          '163.456.789-29', '(11) 98888-0059', '1968-06-25', 'Diabetes'),
  (gen_random_uuid(), 'Kátia Oliveira Torres',      '263.456.789-30', '(11) 98888-0060', '2000-09-09', NULL),
  (gen_random_uuid(), 'Luan Barbosa Silva',         '363.456.789-31', '(11) 98888-0061', '1997-04-15', NULL),
  (gen_random_uuid(), 'Marina Costa Dias',          '463.456.789-32', '(11) 98888-0062', '1985-11-28', 'Alergia a dipirona'),
  (gen_random_uuid(), 'Nathan Oliveira Lima',       '563.456.789-33', '(11) 98888-0063', '2005-01-07', 'Menor de idade'),
  (gen_random_uuid(), 'Orquídea Santos Barbosa',    '663.456.789-34', '(11) 98888-0064', '1979-08-19', NULL),
  (gen_random_uuid(), 'Pedro Henrique Nunes',       '763.456.789-35', '(11) 98888-0065', '1994-12-02', NULL),
  (gen_random_uuid(), 'Quintino Almeida Rocha',     '863.456.789-36', '(11) 98888-0066', '1965-05-21', 'Prótese total'),
  (gen_random_uuid(), 'Ruth Oliveira Campos',       '963.456.789-37', '(11) 98888-0067', '1990-09-13', NULL),
  (gen_random_uuid(), 'Samuel Barbosa Lima',        '073.456.789-38', '(11) 98888-0068', '2003-02-28', NULL),
  (gen_random_uuid(), 'Tânia Cristina Faria',       '173.456.789-39', '(11) 98888-0069', '1986-06-06', 'Enxaqueca'),
  (gen_random_uuid(), 'Ubirajara Silva Neto',       '273.456.789-40', '(11) 98888-0070', '1972-10-30', NULL),
  (gen_random_uuid(), 'Valéria Costa Mendes',       '373.456.789-41', '(11) 98888-0071', '1993-04-12', NULL),
  (gen_random_uuid(), 'Wagner Oliveira Souza',      '473.456.789-42', '(11) 98888-0072', '1981-07-25', 'Cardiopatia'),
  (gen_random_uuid(), 'Yara Barbosa Rocha',         '573.456.789-43', '(11) 98888-0073', '1999-01-17', NULL),
  (gen_random_uuid(), 'Zélia Martins Lima',         '673.456.789-44', '(11) 98888-0074', '1987-09-08', NULL),
  (gen_random_uuid(), 'Alexandre Pereira Gomes',    '773.456.789-45', '(11) 98888-0075', '1975-03-22', 'Usa anticoagulante'),
  (gen_random_uuid(), 'Beatriz Nunes Costa',        '873.456.789-46', '(11) 98888-0076', '2002-08-14', NULL),
  (gen_random_uuid(), 'Cristiano Oliveira Barbosa', '973.456.789-47', '(11) 98888-0077', '1984-11-05', NULL),
  (gen_random_uuid(), 'Daniela Souza Lima',         '083.456.789-48', '(11) 98888-0078', '1996-05-29', 'Gestante'),
  (gen_random_uuid(), 'Eduarda Alves Torres',       '183.456.789-49', '(11) 98888-0079', '2004-12-16', 'Menor de idade'),
  (gen_random_uuid(), 'Francisco Rocha Dias',       '283.456.789-50', '(11) 98888-0080', '1969-07-04', NULL),
  (gen_random_uuid(), 'Geovana Santos Martins',     '383.456.789-51', '(11) 98888-0081', '1991-02-11', 'Alergia a penicilina'),
  (gen_random_uuid(), 'Heitor Campos Silva',        '483.456.789-52', '(11) 98888-0082', '1988-10-27', NULL),
  (gen_random_uuid(), 'Ingrid Oliveira Nunes',      '583.456.789-53', '(11) 98888-0083', '2001-06-18', NULL),
  (gen_random_uuid(), 'Joaquim Barbosa Almeida',    '683.456.789-54', '(11) 98888-0084', '1977-09-09', 'Tabagista'),
  (gen_random_uuid(), 'Lorena Dias Costa',          '783.456.789-55', '(11) 98888-0085', '1995-01-25', NULL),
  (gen_random_uuid(), 'Murilo Lima Rocha',          '883.456.789-56', '(11) 98888-0086', '1983-08-07', NULL),
  (gen_random_uuid(), 'Nicole Alves Souza',         '983.456.789-57', '(11) 98888-0087', '2000-04-01', 'Aparelho ortodôntico'),
  (gen_random_uuid(), 'Osvaldo Pereira Martins',    '093.456.789-58', '(11) 98888-0088', '1963-12-20', 'Próteses existentes'),
  (gen_random_uuid(), 'Paola Cristina Barbosa',     '193.456.789-59', '(11) 98888-0089', '1999-07-14', NULL),
  (gen_random_uuid(), 'Ronaldo Oliveira Campos',    '293.456.789-60', '(11) 98888-0090', '1970-05-30', 'Hipertenso'),
  (gen_random_uuid(), 'Silvia Rocha Torres',        '393.456.789-61', '(11) 98888-0091', '1992-11-08', NULL),
  (gen_random_uuid(), 'Tiago Nunes Barbosa',        '493.456.789-62', '(11) 98888-0092', '1986-03-16', 'Bruxismo'),
  (gen_random_uuid(), 'Ursula Lima Santos',         '593.456.789-63', '(11) 98888-0093', '2003-09-22', NULL),
  (gen_random_uuid(), 'Vinicius Almeida Costa',     '693.456.789-64', '(11) 98888-0094', '1978-02-05', NULL),
  (gen_random_uuid(), 'Wanessa Dias Oliveira',      '793.456.789-65', '(11) 98888-0095', '1994-06-28', NULL),
  (gen_random_uuid(), 'Xavier Barbosa Silva',       '893.456.789-66', '(11) 98888-0096', '1981-10-10', 'Alergia a anestesia'),
  (gen_random_uuid(), 'Yasmin Costa Rocha',         '993.456.789-67', '(11) 98888-0097', '1997-12-03', NULL),
  (gen_random_uuid(), 'Wesley Oliveira Lima',       '103.456.789-68', '(11) 98888-0098', '1989-04-19', NULL),
  (gen_random_uuid(), 'Larissa Fernanda Souza',     '203.456.789-69', '(11) 98888-0099', '2000-08-11', 'Sensibilidade nos dentes'),
  (gen_random_uuid(), 'Felipe Gabriel Alves',       '303.456.789-70', '(11) 98888-0100', '1995-01-30', NULL);

-- Atualiza emails dos pacientes (nome sanitizado + @paciente.com)
UPDATE patients SET email = LOWER(REGEXP_REPLACE(TRANSLATE(name,
  'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
  'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
), '[^a-z0-9]+', '.', 'g')) || '@paciente.com' WHERE email IS NULL;

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

-- 7. HORÁRIOS DE FUNCIONAMENTO DA CLÍNICA
INSERT INTO clinic_hours (day_of_week, open_time, close_time, is_open) VALUES
  (0, '00:00', '01:00', false),
  (1, '08:00', '18:00', true),
  (2, '08:00', '18:00', true),
  (3, '08:00', '18:00', true),
  (4, '08:00', '18:00', true),
  (5, '08:00', '18:00', true),
  (6, '08:00', '12:00', true)
ON CONFLICT (day_of_week) DO NOTHING;

-- 8. DENTIST_PROCEDURES (cada dentista associa os procedimentos com preço próprio)
DO $$
DECLARE
  d RECORD;
  p RECORD;
BEGIN
  FOR d IN SELECT id FROM dentists LOOP
    FOR p IN SELECT id, duration_minutes FROM procedures LOOP
      INSERT INTO dentist_procedures (dentist_id, procedure_id, price, duration_minutes, active)
      VALUES (
        d.id,
        p.id,
        (SELECT price FROM procedures WHERE id = p.id) * (0.9 + random() * 0.3),
        p.duration_minutes,
        TRUE
      );
    END LOOP;
  END LOOP;
END $$;

-- 9. AGENDAMENTOS (appointments) — ~15 por dentista, sem overlaps
DO $$
DECLARE
  d_ids UUID[]; p_ids UUID[]; pr_ids UUID[];
  d_id UUID; p_id UUID; pr_id UUID;
  day_offset INT; slot_start TIMESTAMPTZ; slot_end TIMESTAMPTZ;
  dur INT; st TEXT; i INT; attempts INT;
  used tstzrange[];
  statuses TEXT[] := ARRAY['pending', 'scheduled', 'confirmed', 'completed', 'completed', 'completed', 'completed', 'cancelled'];
  hours INT[] := ARRAY[8, 9, 10, 11, 14, 15, 16];
BEGIN
  SELECT ARRAY(SELECT id FROM patients ORDER BY name) INTO p_ids;
  SELECT ARRAY(SELECT id FROM dentists ORDER BY name) INTO d_ids;
  SELECT ARRAY(SELECT id FROM procedures ORDER BY name) INTO pr_ids;

  FOREACH d_id IN ARRAY d_ids LOOP
    used := ARRAY[]::tstzrange[];
    i := 0;

    WHILE i < 15 LOOP
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
        dur := (SELECT duration_minutes FROM procedures WHERE id = pr_id);
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
        st := statuses[1 + floor(random() * 3)::int];
      END IF;

      INSERT INTO appointments (patient_id, dentist_id, procedure_id, start_time, end_time, status, notes)
      VALUES (p_id, d_id, pr_id, slot_start, slot_end, st,
        CASE WHEN random() < 0.3 THEN 'Observação gerada automaticamente para demonstração.' ELSE NULL END
      );

      i := i + 1;
    END LOOP;
  END LOOP;
END $$;

-- 10. SOLICITAÇÕES DE PROCEDIMENTOS (procedure_requests)
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
