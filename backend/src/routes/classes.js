import express from 'express';
import { query } from '../config/db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/classes — teacher voit sa classe, admin voit toutes
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { school_id, role, id: userId } = req.user;
    let sql, params;

    if (role === 'admin') {
      sql = `
        SELECT c.*, u.first_name || ' ' || u.last_name AS teacher_name,
               COUNT(DISTINCT s.id) AS student_count
        FROM classes c
        LEFT JOIN users u ON c.teacher_id = u.id
        LEFT JOIN students s ON s.class_id = c.id AND s.is_active = true
        WHERE c.school_id = $1 AND c.is_active = true
        GROUP BY c.id, u.first_name, u.last_name
        ORDER BY c.name
      `;
      params = [school_id];
    } else {
      sql = `
        SELECT c.*, u.first_name || ' ' || u.last_name AS teacher_name,
               COUNT(DISTINCT s.id) AS student_count
        FROM classes c
        LEFT JOIN users u ON c.teacher_id = u.id
        LEFT JOIN students s ON s.class_id = c.id AND s.is_active = true
        WHERE c.school_id = $1 AND c.teacher_id = $2 AND c.is_active = true
        GROUP BY c.id, u.first_name, u.last_name
        ORDER BY c.name
      `;
      params = [school_id, userId];
    }

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/classes — admin uniquement
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { name, year, teacher_id, academic_year } = req.body;

    const result = await query(
      `INSERT INTO classes (school_id, name, year, teacher_id, academic_year)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [school_id, name, year, teacher_id, academic_year]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/classes/:id — modifier nom, formateur, année, désactiver (admin only)
router.patch('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { name, academic_year, is_active } = req.body;
    const teacherIdProvided = 'teacher_id' in req.body;

    const setClauses = [];
    const params = [];

    if (name !== undefined) { params.push(name); setClauses.push(`name = COALESCE($${params.length}, name)`); }
    if (academic_year !== undefined) { params.push(academic_year || null); setClauses.push(`academic_year = $${params.length}`); }
    if (teacherIdProvided) { params.push(req.body.teacher_id); setClauses.push(`teacher_id = $${params.length}`); }
    if (is_active !== undefined) { params.push(is_active); setClauses.push(`is_active = $${params.length}`); }

    if (setClauses.length === 0) return res.status(400).json({ error: 'Aucun champ à mettre à jour' });

    params.push(req.params.id, req.user.school_id);
    const result = await query(
      `UPDATE classes SET ${setClauses.join(', ')} WHERE id = $${params.length - 1} AND school_id = $${params.length} RETURNING *`,
      params
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Classe introuvable' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/classes/:id/students — étudiants avec stats via vue student_progress
router.get('/:id/students', requireAuth, async (req, res, next) => {
  try {
    const { school_id } = req.user;
    const { id: classId } = req.params;

    const result = await query(
      `SELECT sp.*, s.student_number, s.email, s.class_id
       FROM student_progress sp
       JOIN students s ON sp.id = s.id
       WHERE s.class_id = $1 AND s.school_id = $2 AND s.is_active = true
       ORDER BY sp.last_name, sp.first_name`,
      [classId, school_id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

export default router;
