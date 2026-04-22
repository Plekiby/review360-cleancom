import express from 'express';
import { query, getClient } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// POST /api/validations — créer une validation + mettre à jour statut fiche + générer alertes
router.post('/', requireAuth, async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const {
      session_id: providedSessionId, activity_sheet_id,
      has_subject, context_well_formulated, objectives_validated,
      methodology_respected, session_grade, comments
    } = req.body;

    // Si pas de session fournie → en créer une automatiquement (validation directe)
    let session_id = providedSessionId;
    if (!session_id) {
      const sheetForSession = await client.query(
        'SELECT student_id FROM activity_sheets WHERE id = $1',
        [activity_sheet_id]
      );
      const studentId = sheetForSession.rows[0]?.student_id;
      const autoSession = await client.query(
        `INSERT INTO follow_up_sessions (student_id, activity_sheet_id, teacher_id, session_date, objective, status)
         VALUES ($1, $2, $3, CURRENT_DATE, 'Validation directe', 'completed')
         RETURNING id`,
        [studentId, activity_sheet_id, req.user.id]
      );
      session_id = autoSession.rows[0].id;
    }

    // Créer la validation
    const valResult = await client.query(
      `INSERT INTO validations (session_id, activity_sheet_id, teacher_id, has_subject, context_well_formulated, objectives_validated, methodology_respected, session_grade, comments)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [session_id, activity_sheet_id, req.user.id, has_subject, context_well_formulated, objectives_validated, methodology_respected ?? null, session_grade ?? null, comments ?? null]
    );

    // Si les 3 points sont validés → fiche passe à "validated"
    const allValidated = has_subject && context_well_formulated && objectives_validated;
    const newStatus = allValidated ? 'validated' : 'in_progress';

    await client.query(
      `UPDATE activity_sheets SET status = $1, updated_at = NOW() WHERE id = $2`,
      [newStatus, activity_sheet_id]
    );

    // Récupérer l'étudiant pour logique alertes
    const sheetResult = await client.query(
      'SELECT student_id FROM activity_sheets WHERE id = $1',
      [activity_sheet_id]
    );
    const studentId = sheetResult.rows[0]?.student_id;

    if (studentId && !allValidated) {
      // Vérifier si points manquants → alerte ORANGE
      if (!has_subject) {
        await client.query(
          `INSERT INTO alerts (student_id, activity_sheet_id, alert_type, reason)
           VALUES ($1, $2, 'ORANGE', 'Sujet non défini')
           ON CONFLICT DO NOTHING`,
          [studentId, activity_sheet_id]
        );
      }
      if (!context_well_formulated) {
        await client.query(
          `INSERT INTO alerts (student_id, activity_sheet_id, alert_type, reason)
           VALUES ($1, $2, 'ORANGE', 'Contexte non bien formulé')`,
          [studentId, activity_sheet_id]
        );
      }
    }

    // Audit log
    await client.query(
      `INSERT INTO audit_logs (school_id, user_id, action, resource_type, resource_id)
       VALUES ($1, $2, 'CREATE_VALIDATION', 'validation', $3)`,
      [req.user.school_id, req.user.id, valResult.rows[0].id]
    );

    await client.query('COMMIT');
    res.status(201).json(valResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// GET /api/validations?studentId=X&status=urgent — historique + filtres
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { studentId, status, sheetId, period } = req.query;
    const conditions = ['s.school_id = $1'];
    const params = [req.user.school_id];

    if (studentId) {
      params.push(studentId);
      conditions.push(`ash.student_id = $${params.length}`);
    }
    if (sheetId) {
      params.push(sheetId);
      conditions.push(`v.activity_sheet_id = $${params.length}`);
    }

    // "urgent" = validations créées il y a > 7 jours et fiche toujours in_progress
    if (status === 'urgent') {
      conditions.push(`ash.status = 'in_progress'`);
      conditions.push(`v.created_at < NOW() - INTERVAL '7 days'`);
    } else if (status === 'in_progress') {
      conditions.push(`ash.status = 'in_progress'`);
    }

    if (period === 'week') {
      conditions.push(`v.created_at >= NOW() - INTERVAL '7 days'`);
    } else if (period === 'month') {
      conditions.push(`v.created_at >= NOW() - INTERVAL '30 days'`);
    } else if (period === 'quarter') {
      conditions.push(`v.created_at >= NOW() - INTERVAL '90 days'`);
    }

    const result = await query(
      `SELECT v.*, ash.sheet_type, ash.sheet_number, ash.title AS sheet_title, ash.status AS sheet_status,
              s.first_name, s.last_name, s.student_number,
              EXTRACT(DAY FROM NOW() - v.created_at) AS days_since_validation
       FROM validations v
       JOIN activity_sheets ash ON v.activity_sheet_id = ash.id
       JOIN students s ON ash.student_id = s.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY v.created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

export default router;
