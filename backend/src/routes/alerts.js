import express from 'express';
import { query } from '../config/db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// POST /api/alerts — créer une alerte ROUGE manuellement (escalade admin)
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { student_id, activity_sheet_id, reason } = req.body;
    if (!student_id) return res.status(400).json({ error: 'student_id requis' });

    const result = await query(
      `INSERT INTO alerts (student_id, activity_sheet_id, alert_type, reason)
       VALUES ($1, $2, 'ROUGE', $3)
       RETURNING *`,
      [student_id, activity_sheet_id || null, reason || 'Escalade manuelle par le responsable']
    );

    await query(
      `INSERT INTO audit_logs (school_id, user_id, action, resource_type, resource_id)
       VALUES ($1, $2, 'ESCALATE_ALERT', 'alert', $3)`,
      [req.user.school_id, req.user.id, result.rows[0].id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/alerts?studentId=X — alertes d'un étudiant
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { studentId } = req.query;
    const conditions = ['s.id = $1', 'a.is_resolved = false'];
    const params = [req.user.school_id];

    if (studentId) {
      params.push(studentId);
      conditions.push(`a.student_id = $${params.length}`);
    }

    const result = await query(
      `SELECT a.*, st.first_name, st.last_name, st.student_number
       FROM alerts a
       JOIN students st ON a.student_id = st.id
       JOIN classes c ON st.class_id = c.id
       JOIN schools s ON c.school_id = s.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY a.created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/alerts/:id — résoudre une alerte (scope school)
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE alerts a SET is_resolved = true, resolved_at = NOW(), updated_at = NOW()
       FROM students st
       JOIN classes c ON st.class_id = c.id
       WHERE a.id = $1 AND a.student_id = st.id AND c.school_id = $2
       RETURNING a.*`,
      [req.params.id, req.user.school_id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Alerte introuvable ou accès refusé' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
