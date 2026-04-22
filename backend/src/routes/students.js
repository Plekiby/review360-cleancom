import express from 'express';
import multer from 'multer';
import ExcelJS from 'exceljs';
import { query, getClient } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// GET /api/students/:id/dashboard — stats d'un étudiant
router.get('/:id/dashboard', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM student_progress WHERE id = $1',
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Étudiant introuvable' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/students/:id/activity-sheets — fiches ADOC + DRCV
router.get('/:id/activity-sheets', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT ash.*,
              COUNT(fs.id) AS sessions_count,
              AVG(v.session_grade) AS avg_grade
       FROM activity_sheets ash
       LEFT JOIN follow_up_sessions fs ON fs.activity_sheet_id = ash.id
       LEFT JOIN validations v ON v.activity_sheet_id = ash.id
       WHERE ash.student_id = $1
       GROUP BY ash.id
       ORDER BY ash.sheet_type, ash.sheet_number`,
      [req.params.id]
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

// PATCH /api/activity-sheets/:id — mettre à jour titre/contexte/objectifs
router.patch('/activity-sheets/:id', requireAuth, async (req, res, next) => {
  try {
    const { title, context, objectives, methodology, status, final_grade } = req.body;
    const result = await query(
      `UPDATE activity_sheets
       SET title = COALESCE($1, title),
           context = COALESCE($2, context),
           objectives = COALESCE($3, objectives),
           methodology = COALESCE($4, methodology),
           status = COALESCE($5, status),
           final_grade = COALESCE($6, final_grade),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [title, context, objectives, methodology, status, final_grade, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Fiche introuvable' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/classes/:classId/import-students — import Excel
router.post('/import/:classId', requireAuth, upload.single('file'), async (req, res, next) => {
  const client = await getClient();
  try {
    if (!req.file) return res.status(400).json({ error: 'Fichier manquant' });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];
    const headerRow = sheet.getRow(1).values.slice(1); // ExcelJS est 1-indexed
    const rows = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const obj = {};
      row.values.slice(1).forEach((val, i) => { obj[headerRow[i]] = val ?? ''; });
      rows.push(obj);
    });

    const { school_id, id: imported_by } = req.user;
    const { classId } = req.params;

    await client.query('BEGIN');

    let importedCount = 0;
    const errors = [];

    for (const [i, row] of rows.entries()) {
      const studentNumber = String(row['Num'] || row['Numéro'] || '').trim();
      const firstName = String(row['Prénom'] || row['Prenom'] || '').trim();
      const lastName = String(row['Nom'] || '').trim();
      const email = String(row['Email'] || '').trim().toLowerCase();

      if (!studentNumber || !firstName || !lastName) {
        errors.push(`Ligne ${i + 2}: données manquantes (Num, Nom, Prénom requis)`);
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
