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
