-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 1. PROFILES (estende auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'dentist', 'receptionist')) DEFAULT 'admin',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PATIENTS
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  cpf TEXT,
  phone TEXT,
  birth_date DATE,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. DENTISTS
CREATE TABLE dentists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  specialty TEXT,
  phone TEXT,
  email TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. PROCEDURES (serviços)
CREATE TABLE procedures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  price DECIMAL(10, 2),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. AVAILABILITY SLOTS (grade de horários)
CREATE TABLE availability_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dentist_id UUID NOT NULL REFERENCES dentists(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_dentist_day UNIQUE (dentist_id, day_of_week, start_time, end_time)
);

-- 6. APPOINTMENTS (agendamentos)
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  dentist_id UUID NOT NULL REFERENCES dentists(id) ON DELETE CASCADE,
  procedure_id UUID REFERENCES procedures(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled')) DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Prevent double-booking
  CONSTRAINT no_overlap_appointments EXCLUDE USING GIST (
    dentist_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  )
);

-- 7. BLOCKED SLOTS (bloqueios de horário)
CREATE TABLE blocked_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dentist_id UUID NOT NULL REFERENCES dentists(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Prevent overlapping blocked slots
  CONSTRAINT no_overlap_blocked EXCLUDE USING GIST (
    dentist_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  ),
  -- Prevent blocked slot overlapping with appointment
  CONSTRAINT no_overlap_blocked_appointment EXCLUDE USING GIST (
    dentist_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  )
);

-- INDEXES
CREATE INDEX idx_patients_name ON patients(name);
CREATE INDEX idx_dentists_name ON dentists(name);
CREATE INDEX idx_procedures_name ON procedures(name);
CREATE INDEX idx_availability_slots_dentist ON availability_slots(dentist_id);
CREATE INDEX idx_appointments_dentist ON appointments(dentist_id);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_date ON appointments(start_time);
CREATE INDEX idx_blocked_slots_dentist ON blocked_slots(dentist_id);

-- ROW LEVEL SECURITY
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE dentists ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_slots ENABLE ROW LEVEL SECURITY;

-- RLS Policies: any authenticated user can do everything (single-tenant)
CREATE POLICY "authenticated users can read profiles"
  ON profiles FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "users can update their own profile"
  ON profiles FOR UPDATE USING (id = auth.uid());

CREATE POLICY "authenticated users can read patients"
  ON patients FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated users can insert patients"
  ON patients FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated users can update patients"
  ON patients FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated users can delete patients"
  ON patients FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated users can read dentists"
  ON dentists FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated users can insert dentists"
  ON dentists FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated users can update dentists"
  ON dentists FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated users can delete dentists"
  ON dentists FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated users can read procedures"
  ON procedures FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated users can insert procedures"
  ON procedures FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated users can update procedures"
  ON procedures FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated users can delete procedures"
  ON procedures FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated users can read availability slots"
  ON availability_slots FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated users can insert availability slots"
  ON availability_slots FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated users can update availability slots"
  ON availability_slots FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated users can delete availability slots"
  ON availability_slots FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated users can read appointments"
  ON appointments FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated users can insert appointments"
  ON appointments FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated users can update appointments"
  ON appointments FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated users can delete appointments"
  ON appointments FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated users can read blocked slots"
  ON blocked_slots FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated users can insert blocked slots"
  ON blocked_slots FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated users can update blocked slots"
  ON blocked_slots FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated users can delete blocked slots"
  ON blocked_slots FOR DELETE USING (auth.role() = 'authenticated');

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'Usuário'),
    'admin'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
