import pg from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'review360_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

const passwordHash = await bcrypt.hash('password123', 10);

// École
const school = await pool.query(
  `INSERT INTO schools (name, siret, contact_email) VALUES ('Clean Com', '12345678901234', 'contact@cleancom.fr')
   ON CONFLICT DO NOTHING RETURNING id`
);

if (!school.rows[0]) {
  console.log('Données de seed déjà présentes.');
  await pool.end();
  process.exit(0);
}

const schoolId = school.rows[0].id;

// Utilisateurs
const admin = await pool.query(
  `INSERT INTO users (school_id, email, password_hash, first_name, last_name, role)
   VALUES ($1, 'admin@cleancom.fr', $2, 'Admin', 'Clean Com', 'admin') RETURNING id`,
  [schoolId, passwordHash]
);

const teachers = [];
for (const t of [
  { email: 'formateur1@cleancom.fr', first_name: 'Marc', last_name: 'Dupont' },
  { email: 'formateur2@cleancom.fr', first_name: 'Sophie', last_name: 'Martin' },
  { email: 'formateur3@cleancom.fr', first_name: 'Pierre', last_name: 'Leroux' },
  { email: 'formateur4@cleancom.fr', first_name: 'Anne', last_name: 'Dubois' },
]) {
  const r = await pool.query(
    `INSERT INTO users (school_id, email, password_hash, first_name, last_name, role)
     VALUES ($1, $2, $3, $4, $5, 'teacher') RETURNING id`,
    [schoolId, t.email, passwordHash, t.first_name, t.last_name]
  );
  teachers.push(r.rows[0].id);
}

// Classes (4 classes MCO)
const classDefs = [
  { name: 'MCO 1A', year: 1, teacherIdx: 0, studentCount: 23 },
  { name: 'MCO 1B', year: 1, teacherIdx: 1, studentCount: 22 },
  { name: 'MCO 2A', year: 2, teacherIdx: 2, studentCount: 21 },
  { name: 'MCO 2B', year: 2, teacherIdx: 3, studentCount: 23 },
];

const lastNames = ['MARTIN', 'BERNARD', 'DUBOIS', 'THOMAS', 'ROBERT', 'RICHARD', 'PETIT', 'DURAND', 'LEROY', 'MOREAU',
  'SIMON', 'LAURENT', 'LEFEBVRE', 'MICHEL', 'GARCIA', 'DAVID', 'BERTRAND', 'ROUX', 'VINCENT', 'FOURNIER',
  'MOREL', 'GIRARD', 'ANDRE', 'LEFEVRE', 'MERCIER'];
const firstNames = ['Pierre', 'Marie', 'Thomas', 'Julie', 'Nicolas', 'Sophie', 'Antoine', 'Laura', 'Maxime', 'Emma',
  'Alexis', 'Camille', 'Lucas', 'Chloé', 'Romain', 'Lucie', 'Julien', 'Manon', 'Baptiste', 'Anaïs',
  'Kevin', 'Pauline', 'Mathieu', 'Charlotte', 'Alexandre'];

let studentNum = 2024001;

for (const cls of classDefs) {
  const classResult = await pool.query(
    `INSERT INTO classes (school_id, name, year, teacher_id, academic_year)
     VALUES ($1, $2, $3, $4, '2024-2025') RETURNING id`,
    [schoolId, cls.name, cls.year, teachers[cls.teacherIdx]]
  );
  const classId = classResult.rows[0].id;

  for (let i = 0; i < cls.studentCount; i++) {
    const studentResult = await pool.query(
      `INSERT INTO students (school_id, class_id, student_number, first_name, last_name, email)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [schoolId, classId, String(studentNum++), firstNames[i % 25], lastNames[i % 25],
        `${firstNames[i % 25].toLowerCase()}.${lastNames[i % 25].toLowerCase()}@etudiant.fr`]
    );
    const studentId = studentResult.rows[0].id;

    for (let n = 1; n <= 5; n++) {
      await pool.query(
        `INSERT INTO activity_sheets (student_id, sheet_type, sheet_number) VALUES ($1, 'ADOC', $2)`,
        [studentId, n]
      );
    }
    for (let n = 1; n <= 4; n++) {
      await pool.query(
        `INSERT INTO activity_sheets (student_id, sheet_type, sheet_number) VALUES ($1, 'DRCV', $2)`,
        [studentId, n]
      );
    }
  }
}

console.log('✅ Données de test insérées');
console.log('   admin@cleancom.fr / password123');
console.log('   formateur1@cleancom.fr / password123');
await pool.end();
