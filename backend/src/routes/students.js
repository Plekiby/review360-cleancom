import express from 'express';
import multer from 'multer';
import ExcelJS from 'exceljs';
import { query, getClient } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/students — créer un étudiant manuellement + ses 9 fiches
router.post('/', requireAuth, async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { student_number, first_name, last_name, email, class_id } = req.body;
    if (!student_number || !first_name || !last_name || !class_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'student_number, first_name, last_name et class_id sont requis' });
    }

    const classCheck = await client.query(
      'SELECT id FROM classes WHERE id = $1 AND school_id = $2 AND is_active = true',
      [class_id, req.user.school_id]
    );
    if (!classCheck.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Classe introuvable' });
    }

    const studentResult = await client.query(
      `INSERT INTO students (school_id, class_id, student_number, first_name, last_name, email)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.school_id, class_id, student_number.trim(), first_name.trim(), last_name.trim(), email?.trim().toLowerCase() || null]
    );
    const studentId = studentResult.rows[0].id;

    for (let n = 1; n <= 5; n++) {
      await client.query(
        `INSERT INTO activity_sheets (student_id, sheet_type, sheet_number) VALUES ($1, 'ADOC', $2) ON CONFLICT DO NOTHING`,
        [studentId, n]
      );
    }
    for (let n = 1; n <= 4; n++) {
      await client.query(
        `INSERT INTO activity_sheets (student_id, sheet_type, sheet_number) VALUES ($1, 'DRCV', $2) ON CONFLICT DO NOTHING`,
        [studentId, n]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(studentResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'Ce numéro étudiant existe déjà dans cette école' });
    next(err);
  } finally {
    client.release();
  }
});

// GET /api/students/:id/dashboard — stats d'un étudiant (scopé à l'école)
router.get('/:id/dashboard', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT sp.* FROM student_progress sp
       JOIN students s ON sp.id = s.id
       JOIN classes c ON s.class_id = c.id
       WHERE sp.id = $1 AND c.school_id = $2`,
      [req.params.id, req.user.school_id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Étudiant introuvable' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/students/:id/activity-sheets — fiches ADOC + DRCV (scopé à l'école du user)
router.get('/:id/activity-sheets', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT ash.*,
              COUNT(DISTINCT fs.id) AS sessions_count,
              AVG(DISTINCT v.session_grade) AS avg_grade
       FROM activity_sheets ash
       JOIN students s ON ash.student_id = s.id
       JOIN classes c ON s.class_id = c.id
       LEFT JOIN follow_up_sessions fs ON fs.activity_sheet_id = ash.id
       LEFT JOIN validations v ON v.activity_sheet_id = ash.id
       WHERE ash.student_id = $1 AND c.school_id = $2
       GROUP BY ash.id
       ORDER BY ash.sheet_type, ash.sheet_number`,
      [req.params.id, req.user.school_id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/students/:id/activity-sheets — créer les 9 fiches (5 ADOC + 4 DRCV)
router.post('/:id/activity-sheets', requireAuth, async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const sheets = [];

    for (let i = 1; i <= 5; i++) {
      sheets.push({ type: 'ADOC', number: i });
    }
    for (let i = 1; i <= 4; i++) {
      sheets.push({ type: 'DRCV', number: i });
    }

    const created = [];
    for (const sheet of sheets) {
      const r = await client.query(
        `INSERT INTO activity_sheets (student_id, sheet_type, sheet_number)
         VALUES ($1, $2, $3)
         ON CONFLICT (student_id, sheet_type, sheet_number) DO NOTHING
         RETURNING *`,
        [req.params.id, sheet.type, sheet.number]
      );
      if (r.rows[0]) created.push(r.rows[0]);
    }

    await client.query('COMMIT');
    res.status(201).json({ created: created.length, sheets: created });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// PATCH /api/activity-sheets/:id — mettre à jour titre/contexte/objectifs (scopé à l'école)
router.patch('/activity-sheets/:id', requireAuth, async (req, res, next) => {
  try {
    const { title, context, objectives, methodology, status, final_grade } = req.body;
    const result = await query(
      `UPDATE activity_sheets ash
       SET title = COALESCE($1, ash.title),
           context = COALESCE($2, ash.context),
           objectives = COALESCE($3, ash.objectives),
           methodology = COALESCE($4, ash.methodology),
           status = COALESCE($5, ash.status),
           final_grade = COALESCE($6, ash.final_grade),
           updated_at = NOW()
       FROM students s
       JOIN classes c ON s.class_id = c.id
       WHERE ash.id = $7 AND ash.student_id = s.id AND c.school_id = $8
       RETURNING ash.*`,
      [title, context, objectives, methodology, status, final_grade, req.params.id, req.user.school_id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Fiche introuvable ou accès refusé' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/students/:id — modifier ou désactiver un étudiant (scopé à l'école)
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const { first_name, last_name, email, student_number, is_active } = req.body;

    const result = await query(
      `UPDATE students
       SET first_name      = COALESCE($1, first_name),
           last_name       = COALESCE($2, last_name),
           email           = COALESCE($3, email),
           student_number  = COALESCE($4, student_number),
           is_active       = COALESCE($5, is_active)
       FROM classes c
       WHERE students.id = $6 AND students.class_id = c.id AND c.school_id = $7
       RETURNING students.*`,
      [
        first_name ? first_name.trim() : null,
        last_name ? last_name.trim() : null,
        email ? email.trim().toLowerCase() : null,
        student_number ? student_number.trim() : null,
        is_active !== undefined ? is_active : null,
        req.params.id,
        req.user.school_id,
      ]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Étudiant introuvable ou accès refusé' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ce numéro étudiant existe déjà' });
    next(err);
  }
});

// Normalise un en-tête Excel : minuscules, sans accents, espaces → underscores
function normalizeKey(h) {
  return String(h || '').trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '_');
}

// Extraire et normaliser les lignes d'un buffer Excel
async function parseExcelBuffer(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  const rawHeaders = sheet.getRow(1).values.slice(1);
  const normalizedHeaders = rawHeaders.map(normalizeKey);
  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj = {};
    row.values.slice(1).forEach((val, i) => {
      if (normalizedHeaders[i]) obj[normalizedHeaders[i]] = val ?? '';
    });
    rows.push(obj);
  });
  return rows;
}

function normalizeRow(row, lineNumber) {
  // Accepte : num, numero, num_etudiant, number, matricule
  const studentNumber = String(row['num'] || row['numero'] || row['num_etudiant'] || row['number'] || row['matricule'] || '').trim();
  // Accepte : prenom, firstname, first_name
  const firstName = String(row['prenom'] || row['firstname'] || row['first_name'] || '').trim();
  // Accepte : nom, lastname, last_name
  const lastName = String(row['nom'] || row['lastname'] || row['last_name'] || '').trim();
  // Accepte : email, mail, courriel
  const email = String(row['email'] || row['mail'] || row['courriel'] || '').trim().toLowerCase();
  const valid = !!(studentNumber && firstName && lastName);
  const error = valid ? null : `Ligne ${lineNumber}: colonnes Num, Nom et Prénom requises (en-tête insensible à la casse et aux accents)`;
  return { studentNumber, firstName, lastName, email, valid, error };
}

// POST /api/students/preview/:classId — parse sans insérer
router.post('/preview/:classId', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Fichier manquant' });
    const rawRows = await parseExcelBuffer(req.file.buffer);
    const preview = rawRows.map((row, i) => normalizeRow(row, i + 2));
    const validCount = preview.filter((r) => r.valid).length;
    const errorCount = preview.filter((r) => !r.valid).length;
    res.json({ rows: preview, valid_count: validCount, error_count: errorCount });
  } catch (err) {
    next(err);
  }
});

// POST /api/students/import/:classId — import Excel
router.post('/import/:classId', requireAuth, upload.single('file'), async (req, res, next) => {
  const client = await getClient();
  try {
    if (!req.file) return res.status(400).json({ error: 'Fichier manquant' });

    const rawRows = await parseExcelBuffer(req.file.buffer);
    const normalized = rawRows.map((row, i) => normalizeRow(row, i + 2));

    const { school_id, id: imported_by } = req.user;
    const { classId } = req.params;

    await client.query('BEGIN');

    let importedCount = 0;
    const errors = [];

    for (let i = 0; i < normalized.length; i++) {
      const { studentNumber, firstName, lastName, email, valid, error } = normalized[i];

      if (!valid) {
        errors.push(error);
        continue;
      }

      try {
        const studentResult = await client.query(
          `INSERT INTO students (school_id, class_id, student_number, first_name, last_name, email)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (school_id, student_number) DO UPDATE
             SET class_id = EXCLUDED.class_id,
                 first_name = EXCLUDED.first_name,
                 last_name = EXCLUDED.last_name,
                 email = EXCLUDED.email
           RETURNING id`,
          [school_id, classId, studentNumber, firstName, lastName, email || null]
        );

        const studentId = studentResult.rows[0].id;

        // Créer les 9 fiches automatiquement
        for (let n = 1; n <= 5; n++) {
          await client.query(
            `INSERT INTO activity_sheets (student_id, sheet_type, sheet_number)
             VALUES ($1, 'ADOC', $2)
             ON CONFLICT (student_id, sheet_type, sheet_number) DO NOTHING`,
            [studentId, n]
          );
        }
        for (let n = 1; n <= 4; n++) {
          await client.query(
            `INSERT INTO activity_sheets (student_id, sheet_type, sheet_number)
             VALUES ($1, 'DRCV', $2)
             ON CONFLICT (student_id, sheet_type, sheet_number) DO NOTHING`,
            [studentId, n]
          );
        }

        importedCount++;
      } catch (rowErr) {
        errors.push(`Ligne ${i + 2}: ${rowErr.message}`);
      }
    }

    await client.query(
      `INSERT INTO import_logs (school_id, class_id, filename, imported_count, error_count, error_details, imported_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [school_id, classId, req.file.originalname, importedCount, errors.length, JSON.stringify(errors), imported_by]
    );

    await client.query('COMMIT');
    res.json({ imported: importedCount, errors: errors.length, error_details: errors });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

export default router;
