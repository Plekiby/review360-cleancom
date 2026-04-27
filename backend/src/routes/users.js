import express from 'express';
import bcrypt from 'bcrypt';
import { query } from '../config/db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/users?role=teacher — liste les comptes de l'école (admin only)
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const { role } = req.query;
    const params = [req.user.school_id];
    const conditions = ['school_id = $1'];
    if (role) {
      params.push(role);
      conditions.push(`role = $${params.length}`);
    }
    const result = await query(
      `SELECT id, email, first_name, last_name, role, is_active, created_at
       FROM users WHERE ${conditions.join(' AND ')}
       ORDER BY role, last_name, first_name`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/users — créer un formateur ou admin (admin only)
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { email, password, first_name, last_name, role = 'teacher' } = req.body;
    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({ error: 'email, password, first_name et last_name sont requis' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caractères' });
    }
    if (!['teacher', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide (teacher ou admin)' });
    }
    const password_hash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO users (school_id, email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, first_name, last_name, role, is_active, created_at`,
      [req.user.school_id, email.toLowerCase().trim(), password_hash, first_name.trim(), last_name.trim(), role]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    next(err);
  }
});

// PATCH /api/users/:id — modifier profil, activer/désactiver, reset mot de passe (admin only)
router.patch('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { first_name, last_name, email, is_active, new_password } = req.body;

    const existing = await query(
      'SELECT id FROM users WHERE id = $1 AND school_id = $2',
      [req.params.id, req.user.school_id]
    );
    if (!existing.rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable' });

    const params = [
      first_name ? first_name.trim() : null,
      last_name ? last_name.trim() : null,
      email ? email.toLowerCase().trim() : null,
      is_active !== undefined ? is_active : null,
      req.params.id,
      req.user.school_id,
    ];

    let pwdClause = '';
    if (new_password) {
      if (new_password.length < 8) {
        return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caractères' });
      }
      params.push(await bcrypt.hash(new_password, 12));
      pwdClause = `, password_hash = $${params.length}`;
    }

    const result = await query(
      `UPDATE users SET
         first_name = COALESCE($1, first_name),
         last_name  = COALESCE($2, last_name),
         email      = COALESCE($3, email),
         is_active  = COALESCE($4, is_active)
         ${pwdClause}
       WHERE id = $5 AND school_id = $6
       RETURNING id, email, first_name, last_name, role, is_active, created_at`,
      params
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    next(err);
  }
});

export default router;
