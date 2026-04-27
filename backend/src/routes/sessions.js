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

// Transitions de statut autorisées
const VALID_TRANSITIONS = {
  scheduled:   new Set(['completed', 'cancelled', 'rescheduled']),
  rescheduled: new Set(['completed', 'cancelled', 'scheduled']),
  completed:   new Set([]), // terminal — on garde figé après réalisation
  cancelled:   new Set([]), // terminal
};

// PATCH /api/sessions/:id — marquer complétée / annulée / reportée + notes post-session
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const { status, location, objective, notes } = req.body;

    // Charger la session pour vérifier ownership + transition
    const existing = await query(
      `SELECT fs.*, s.school_id
         FROM follow_up_sessions fs
         JOIN students s ON fs.student_id = s.id
        WHERE fs.id = $1`,
      [req.params.id]
    );
    if (!existing.rows[0]) return res.status(404).json({ error: 'Session introuvable' });

    const session = existing.rows[0];

    // Multi-tenant : on n'autorise jamais la modif d'une session hors de l'école courante
    if (session.school_id !== req.user.school_id) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    // Ownership : seul le prof qui a créé la session (ou un admin de l'école) peut la modifier
    if (req.user.role !== 'admin' && session.teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'Vous ne pouvez modifier que vos propres sessions' });
    }

    // Validation des transitions de statut
    if (status && status !== session.status) {
      const allowed = VALID_TRANSITIONS[session.status] || new Set();
      if (!allowed.has(status)) {
        return res.status(409).json({
          error: `Transition non autorisée : ${session.status} → ${status}`,
        });
      }
    }

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
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
