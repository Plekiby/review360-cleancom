import express from 'express';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// POST /api/sessions — créer une session de suivi
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { student_id, activity_sheet_id, session_date, session_time, location, objective } = req.body;

    const result = await query(
      `INSERT INTO follow_up_sessions (student_id, activity_sheet_id, teacher_id, session_date, session_time, location, objective)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [student_id, activity_sheet_id, req.user.id, session_date, session_time || null, location || null, objective || null]
    );

    // Dès qu'une session est créée, la fiche passe en "in_progress" si elle était "not_started"
    await query(
      `UPDATE activity_sheets SET status = 'in_progress', updated_at = NOW()
       WHERE id = $1 AND status = 'not_started'`,
      [activity_sheet_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/sessions?studentId=X — sessions d'un étudiant
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { studentId, sheetId } = req.query;
    const conditions = [];
    const params = [];

    if (studentId) {
      params.push(studentId);
      conditions.push(`fs.student_id = $${params.length}`);
    }
    if (sheetId) {
      params.push(sheetId);
      conditions.push(`fs.activity_sheet_id = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT fs.*, ash.sheet_type, ash.sheet_number, ash.title AS sheet_title,
              u.first_name || ' ' || u.last_name AS teacher_name
       FROM follow_up_sessions fs
       JOIN activity_sheets ash ON fs.activity_sheet_id = ash.id
       JOIN users u ON fs.teacher_id = u.id
       ${where}
       ORDER BY fs.session_date DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/sessions/:id — marquer complétée / annulée / reportée + notes post-session
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const { status, location, objective, notes } = req.body;
    const result = await query(
      `UPDATE follow_up_sessions
       SET status = COALESCE($1, status),
           location = COALESCE($2, location),
           objective = COALESCE($3, objective),
           notes = COALESCE($4, notes),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [status || null, location || null, objective || null, notes !== undefined ? notes : null, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Session introuvable' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
