-- ===========================
-- SCHEMA REVIEW360N
-- Système de Suivi BTS MCO Multi-tenant SaaS
-- ===========================

-- EXTENSION UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========== SCHOOLS (Multi-tenant) ==========
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  siret VARCHAR(14),
  contact_email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  subscription_tier VARCHAR(50) DEFAULT 'basic', -- basic, pro, enterprise
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========== USERS (Enseignants, Admins) ==========
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('teacher', 'admin')), -- Enseignant ou Admin école
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(school_id, email)
);

CREATE INDEX IF NOT EXISTS idx_users_school ON users(school_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ========== CLASSES ==========
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL, -- MCO1A, MCO2B, etc.
  year SMALLINT CHECK (year IN (1, 2)), -- 1ère ou 2ème année (optionnel)
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Enseignant responsable
  academic_year VARCHAR(9), -- 2024-2025 (optionnel)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(school_id, name, academic_year)
);

CREATE INDEX IF NOT EXISTS idx_classes_school ON classes(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);

-- ========== STUDENTS ==========
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_number VARCHAR(20) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(school_id, student_number)
);

CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);

-- ========== ACTIVITY SHEETS (Fiches ADOC & DRCV) ==========
CREATE TABLE IF NOT EXISTS activity_sheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  sheet_type VARCHAR(10) NOT NULL CHECK (sheet_type IN ('ADOC', 'DRCV')), -- Type de fiche
  sheet_number SMALLINT NOT NULL, -- 1-5 pour ADOC, 1-4 pour DRCV

  -- Contenu de la fiche
  title VARCHAR(255),
  context TEXT,
  objectives TEXT,
  methodology TEXT,

  -- Validation
  status VARCHAR(50) NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed', 'validated')),
  final_grade DECIMAL(3, 1), -- Note finale /10

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, sheet_type, sheet_number)
);

CREATE INDEX IF NOT EXISTS idx_activity_sheets_student ON activity_sheets(student_id);
CREATE INDEX IF NOT EXISTS idx_activity_sheets_status ON activity_sheets(status);

-- ========== FOLLOW-UP SESSIONS (Sessions de suivi) ==========
CREATE TABLE IF NOT EXISTS follow_up_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  activity_sheet_id UUID NOT NULL REFERENCES activity_sheets(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

  session_date DATE NOT NULL,
  session_time TIME,
  location VARCHAR(255),
  objective TEXT,

  status VARCHAR(50) NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),

  notes TEXT, -- Observations post-session

  -- Intégration Google Calendar (optionnel)
  google_calendar_event_id VARCHAR(255),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_student ON follow_up_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_teacher ON follow_up_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON follow_up_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_sessions_activity ON follow_up_sessions(activity_sheet_id);

-- ========== VALIDATIONS (Points de validation) ==========
CREATE TABLE IF NOT EXISTS validations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES follow_up_sessions(id) ON DELETE CASCADE,
  activity_sheet_id UUID NOT NULL REFERENCES activity_sheets(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

  -- 3 points de contrôle critiques
  has_subject BOOLEAN,
  context_well_formulated BOOLEAN,
  objectives_validated BOOLEAN,

  -- Optionnel
  methodology_respected BOOLEAN DEFAULT NULL,

  -- Notes et commentaires
  session_grade DECIMAL(3, 1), -- Note session /10
  comments TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_validations_sheet ON validations(activity_sheet_id);
CREATE INDEX IF NOT EXISTS idx_validations_session ON validations(session_id);
CREATE INDEX IF NOT EXISTS idx_validations_teacher ON validations(teacher_id);

-- ========== ALERTS (Système d'alertes) ==========
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  activity_sheet_id UUID REFERENCES activity_sheets(id) ON DELETE CASCADE,

  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('VERT', 'ORANGE', 'ROUGE')),
  reason TEXT NOT NULL, -- "Retard contexte", "Pas de sujet", etc.

  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alerts_student ON alerts(student_id);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(is_resolved);

-- ========== IMPORT LOGS (Historique des imports Excel) ==========
CREATE TABLE IF NOT EXISTS import_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,

  filename VARCHAR(255),
  imported_count SMALLINT DEFAULT 0,
  error_count SMALLINT DEFAULT 0,
  error_details TEXT, -- JSON avec détails erreurs

  imported_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_import_logs_school ON import_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_created ON import_logs(created_at);

-- ========== AUDIT LOG (Historique des actions) ==========
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  action VARCHAR(100) NOT NULL, -- 'CREATE_VALIDATION', 'UPDATE_SESSION', 'IMPORT_STUDENTS', etc.
  resource_type VARCHAR(50), -- 'student', 'validation', 'session'
  resource_id UUID,

  changes JSONB, -- {before: {...}, after: {...}}
  ip_address INET,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_school ON audit_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- ========== VUE : Progression étudiant ==========
CREATE OR REPLACE VIEW student_progress AS
SELECT
  s.id,
  s.first_name,
  s.last_name,
  c.name as class_name,
  COUNT(CASE WHEN ash.sheet_type = 'ADOC' AND ash.status = 'validated' THEN 1 END) as adoc_validated,
  COUNT(CASE WHEN ash.sheet_type = 'DRCV' AND ash.status = 'validated' THEN 1 END) as drcv_validated,
  AVG(v.session_grade) as average_grade,
  MAX(fs.session_date) as last_session_date,
  COUNT(CASE WHEN al.alert_type = 'ROUGE' AND al.is_resolved = false THEN 1 END) as critical_alerts
FROM students s
LEFT JOIN classes c ON s.class_id = c.id
LEFT JOIN activity_sheets ash ON s.id = ash.student_id
LEFT JOIN validations v ON ash.id = v.activity_sheet_id
LEFT JOIN follow_up_sessions fs ON ash.id = fs.activity_sheet_id
LEFT JOIN alerts al ON s.id = al.student_id
GROUP BY s.id, c.id;

-- ========== VUE : Dashboard formateur ==========
CREATE OR REPLACE VIEW teacher_dashboard AS
SELECT
  c.id as class_id,
  c.name as class_name,
  COUNT(DISTINCT s.id) as total_students,
  COUNT(DISTINCT CASE WHEN ash.status = 'validated' THEN ash.id END) as completed_sheets,
  COUNT(DISTINCT CASE WHEN al.alert_type = 'ROUGE' THEN al.id END) as critical_alerts,
  AVG(v.session_grade) as average_class_grade
FROM classes c
LEFT JOIN students s ON c.id = s.class_id
LEFT JOIN activity_sheets ash ON s.id = ash.student_id
LEFT JOIN validations v ON ash.id = v.activity_sheet_id
LEFT JOIN alerts al ON s.id = al.student_id
WHERE c.is_active = true AND s.is_active = true
GROUP BY c.id;
