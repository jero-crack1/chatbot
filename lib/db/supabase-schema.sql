-- ========================================================
-- LeadFlow Agent - Esquema de Base de Datos para Supabase
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase:
-- https://supabase.com/dashboard/project/_/sql
-- ========================================================

-- 1. Tabla de Prospectos / Leads
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  nombre TEXT NOT NULL,
  empresa TEXT NOT NULL,
  correo TEXT NOT NULL,
  tipo_lead TEXT NOT NULL DEFAULT 'Informativo/Académico',
  fecha_reunion TEXT
);

-- Migra tablas anteriores que usaban columnas en inglés sin borrar los registros.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS nombre TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS empresa TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS correo TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tipo_lead TEXT DEFAULT 'Informativo/Académico';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS fecha_reunion TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'name') THEN
    EXECUTE 'UPDATE leads SET nombre = COALESCE(nombre, name) WHERE nombre IS NULL';
    EXECUTE 'ALTER TABLE leads ALTER COLUMN name DROP NOT NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'company') THEN
    EXECUTE 'UPDATE leads SET empresa = COALESCE(empresa, company) WHERE empresa IS NULL';
    EXECUTE 'ALTER TABLE leads ALTER COLUMN company DROP NOT NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'email') THEN
    EXECUTE 'UPDATE leads SET correo = COALESCE(correo, email) WHERE correo IS NULL';
    EXECUTE 'ALTER TABLE leads ALTER COLUMN email DROP NOT NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'need') THEN
    EXECUTE 'ALTER TABLE leads ALTER COLUMN need DROP NOT NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'qualification_status') THEN
    EXECUTE 'UPDATE leads SET tipo_lead = CASE WHEN qualification_status = ''calificado'' THEN ''Calificado'' ELSE COALESCE(tipo_lead, ''Informativo/Académico'') END';
  END IF;
END $$;

ALTER TABLE leads ALTER COLUMN nombre SET NOT NULL;
ALTER TABLE leads ALTER COLUMN empresa SET NOT NULL;
ALTER TABLE leads ALTER COLUMN correo SET NOT NULL;
ALTER TABLE leads ALTER COLUMN tipo_lead SET DEFAULT 'Informativo/Académico';

-- 2. Tabla de Reuniones Agendadas / Meetings
CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  lead_id TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT NOT NULL,
  preferred_date TEXT NOT NULL,
  topic TEXT NOT NULL,
  meeting_link TEXT,
  calendar_event_id TEXT,
  status TEXT DEFAULT 'confirmed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas rápidas en el dashboard
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_created_at ON meetings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_email ON meetings(email);

-- Habilitar Row Level Security (RLS) opcionalmente
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- Compatibilidad para proyectos que ya crearon la tabla anterior.
ALTER TABLE meetings ALTER COLUMN meeting_link DROP NOT NULL;

-- No se crean pol�ticas para anon/authenticated: la app escribe desde el servidor
-- con POSTGRES_URL; RLS mantiene los datos fuera del acceso p�blico.

