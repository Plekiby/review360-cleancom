import express from 'express';
import { query } from '../config/db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { generateReportPDF } from '../utils/pdfGenerator.js';
import { generateReportExcel } from '../utils/excelGenerator.js';

const router = express.Router();

// GET /api/dashboard/teacher — KPIs formateur (sa classe)
router.get('/teacher', requireAuth, async (req, res, next) => {
  try {
    const { school_id, id: userId } = req.user;

    const kpis = await query(
      `SELECT td.*
       FROM teacher_dashboard td
       JOIN classes c ON td.class_id = c.id
       WHERE c.school_id = $1 AND c.teacher_id = $2`,
      [school_id, userId]
    );

    // Alertes urgentes (> 7 jours sans validation)
    const urgentAlerts = await query(
      `SELECT a.*, s.first_name, s.last_name, ash.sheet_type, ash.sheet_number
       FROM alerts a
       JOIN students s ON a.student_id = s.id
       JOIN classes c ON s.class_id = c.id
       LEFT JOIN activity_sheets ash ON a.activity_sheet_id = ash.id
       WHERE c.teacher_id = $1 AND a.is_resolved = false
       ORDER BY a.created_at DESC
       LIMIT 10`,
      [userId]
    );

    // Validations récentes (7 derniers jours)
    const recentValidations = await query(
      `SELECT v.*, s.first_name, s.last_name, ash.sheet_type, ash.sheet_number
       FROM validations v
       JOIN activity_sheets ash ON v.activity_sheet_id = ash.id
       JOIN students s ON ash.student_id = s.id
       JOIN classes c ON s.class_id = c.id
       WHERE c.teacher_id = $1 AND v.created_at > NOW() - INTERVAL '7 days'
       ORDER BY v.created_at DESC`,
      [userId]
    );

    // Stat boxes: total validations urgentes / en cours / validées cette semaine / délai moyen
    const statsResult = await query(
      `SELECT
         COUNT(CASE WHEN ash.status = 'in_progress' AND v.created_at < NOW() - INTERVAL '7 days' THEN 1 END) AS urgent_count,
         COUNT(CASE WHEN ash.status = 'in_progress' THEN 1 END) AS in_progress_count,
         COUNT(CASE WHEN ash.status = 'validated' AND ash.updated_at > NOW() - INTERVAL '7 days' THEN 1 END) AS validated_this_week,
         ROUND(AVG(CASE WHEN ash.status = 'validated' THEN EXTRACT(DAY FROM ash.updated_at - v.created_at) END), 1) AS avg_validation_days
       FROM validations v
       JOIN activity_sheets ash ON v.activity_sheet_id = ash.id
       JOIN students s ON ash.student_id = s.id
       JOIN classes c ON s.class_id = c.id
       WHERE c.teacher_id = $1 AND c.school_id = $2`,
      [userId, school_id]
    );

    res.json({
      classes: kpis.rows,
      stats: statsResult.rows[0],
      urgent_alerts: urgentAlerts.rows,
      recent_validations: recentValidations.rows,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/school — KPIs admin (toutes les classes)
router.get('/school', requireAdmin, async (req, res, next) => {
  try {
    const { school_id } = req.user;

    // Stats globales
    const globalStats = await query(
      `SELECT
         COUNT(DISTINCT c.id) AS total_classes,
         COUNT(DISTINCT s.id) AS total_students,
         ROUND(AVG(v.session_grade), 1) AS global_avg,
         COUNT(DISTINCT CASE WHEN al.is_resolved = false THEN al.id END) AS active_alerts
       FROM classes c
       LEFT JOIN students s ON s.class_id = c.id AND s.is_active = true
       LEFT JOIN activity_sheets ash ON ash.student_id = s.id
       LEFT JOIN validations v ON v.activity_sheet_id = ash.id
       LEFT JOIN alerts al ON al.student_id = s.id
       WHERE c.school_id = $1 AND c.is_active = true`,
      [school_id]
    );

    // Cards classes avec progression ADOC / DRCV
    const classCards = await query(
      `SELECT
         c.id, c.name, c.academic_year,
         u.first_name || ' ' || u.last_name AS teacher_name,
         COUNT(DISTINCT s.id) AS student_count,
         ROUND(AVG(v.session_grade), 1) AS avg_grade,
         ROUND(
           100.0 * COUNT(DISTINCT CASE WHEN ash.sheet_type = 'ADOC' AND ash.status = 'validated' THEN ash.id END)
           / NULLIF(COUNT(DISTINCT CASE WHEN ash.sheet_type = 'ADOC' THEN ash.id END), 0)
         , 0) AS adoc_pct,
         ROUND(
           100.0 * COUNT(DISTINCT CASE WHEN ash.sheet_type = 'DRCV' AND ash.status = 'validated' THEN ash.id END)
           / NULLIF(COUNT(DISTINCT CASE WHEN ash.sheet_type = 'DRCV' THEN ash.id END), 0)
         , 0) AS drcv_pct,
         COUNT(DISTINCT CASE WHEN al.alert_type = 'ROUGE' AND al.is_resolved = false THEN al.id END) AS critical_alerts
       FROM classes c
       LEFT JOIN users u ON c.teacher_id = u.id
       LEFT JOIN students s ON s.class_id = c.id AND s.is_active = true
       LEFT JOIN activity_sheets ash ON ash.student_id = s.id
       LEFT JOIN validations v ON v.activity_sheet_id = ash.id
       LEFT JOIN alerts al ON al.student_id = s.id
       WHERE c.school_id = $1 AND c.is_active = true
       GROUP BY c.id, u.first_name, u.last_name
       ORDER BY c.name`,
      [school_id]
    );

    res.json({
      global: globalStats.rows[0],
      classes: classCards.rows,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/reports — synthèse pour AdminReports
router.get('/reports', requireAdmin, async (req, res, next) => {
  try {
    const { school_id } = req.user;

    const summary = await query(
      `SELECT
         COUNT(DISTINCT s.id) AS total_students,
         COUNT(DISTINCT ash.id) AS total_sheets,
         COUNT(DISTINCT CASE WHEN ash.status = 'validated' THEN ash.id END) AS validated_sheets,
         ROUND(AVG(v.session_grade), 1) AS global_avg,
         COUNT(DISTINCT CASE WHEN al.alert_type IN ('ORANGE','ROUGE') AND al.is_resolved = false THEN s.id END) AS at_risk_students
       FROM students s
       JOIN classes c ON s.class_id = c.id
       LEFT JOIN activity_sheets ash ON ash.student_id = s.id
       LEFT JOIN validations v ON v.activity_sheet_id = ash.id
       LEFT JOIN alerts al ON al.student_id = s.id
       WHERE c.school_id = $1 AND s.is_active = true`,
      [school_id]
    );

    const byClass = await query(
      `SELECT
         c.name AS class_name,
         u.first_name || ' ' || u.last_name AS teacher_name,
         COUNT(DISTINCT s.id) AS students,
         ROUND(AVG(v.session_grade), 1) AS avg_grade,
         ROUND(100.0 * COUNT(DISTINCT CASE WHEN ash.status = 'validated' THEN ash.id END) / NULLIF(COUNT(DISTINCT ash.id), 0), 0) AS progress_pct,
         COUNT(DISTINCT CASE WHEN al.is_resolved = false THEN al.id END) AS active_alerts
       FROM classes c
       LEFT JOIN users u ON c.teacher_id = u.id
       LEFT JOIN students s ON s.class_id = c.id AND s.is_active = true
       LEFT JOIN activity_sheets ash ON ash.student_id = s.id
       LEFT JOIN validations v ON v.activity_sheet_id = ash.id
       LEFT JOIN alerts al ON al.student_id = s.id
       WHERE c.school_id = $1 AND c.is_active = true
       GROUP BY c.id, u.first_name, u.last_name
       ORDER BY c.name`,
      [school_id]
    );

    res.json({ summary: summary.rows[0], by_class: byClass.rows });
  } catch (err) {
    next(err);
  }
});

// ── Helpers partagés export ────────────────────────────────────────────────
async function fetchReportData(school_id) {
  const summary = await query(
    `SELECT
       COUNT(DISTINCT s.id) AS total_students,
       COUNT(DISTINCT ash.id) AS total_sheets,
       COUNT(DISTINCT CASE WHEN ash.status = 'validated' THEN ash.id END) AS validated_sheets,
       ROUND(AVG(v.session_grade), 1) AS global_avg,
       COUNT(DISTINCT CASE WHEN al.alert_type IN ('ORANGE','ROUGE') AND al.is_resolved = false THEN s.id END) AS at_risk_students
     FROM students s
     JOIN classes c ON s.class_id = c.id
     LEFT JOIN activity_sheets ash ON ash.student_id = s.id
     LEFT JOIN validations v ON v.activity_sheet_id = ash.id
     LEFT JOIN alerts al ON al.student_id = s.id
     WHERE c.school_id = $1 AND s.is_active = true`,
    [school_id]
  );

  const byClass = await query(
    `SELECT
       c.name AS class_name,
       u.first_name || ' ' || u.last_name AS teacher_name,
       COUNT(DISTINCT s.id) AS students,
       ROUND(AVG(v.session_grade), 1) AS avg_grade,
       ROUND(100.0 * COUNT(DISTINCT CASE WHEN ash.status = 'validated' THEN ash.id END) / NULLIF(COUNT(DISTINCT ash.id), 0), 0) AS progress_pct,
       COUNT(DISTINCT CASE WHEN al.is_resolved = false THEN al.id END) AS active_alerts
     FROM classes c
     LEFT JOIN users u ON c.teacher_id = u.id
     LEFT JOIN students s ON s.class_id = c.id AND s.is_active = true
     LEFT JOIN activity_sheets ash ON ash.student_id = s.id
     LEFT JOIN validations v ON v.activity_sheet_id = ash.id
     LEFT JOIN alerts al ON al.student_id = s.id
     WHERE c.school_id = $1 AND c.is_active = true
     GROUP BY c.id, u.first_name, u.last_name
     ORDER BY c.name`,
    [school_id]
  );

  const atRisk = await query(
    `SELECT s.id, s.last_name, s.first_name, s.student_number,
            c.name AS class_name,
            sp.average_grade, sp.adoc_validated, sp.drcv_validated, sp.critical_alerts
     FROM student_progress sp
     JOIN students s ON sp.student_id = s.id
     JOIN classes c ON s.class_id = c.id
     WHERE c.school_id = $1 AND (sp.critical_alerts > 0 OR sp.average_grade < 6)
     ORDER BY sp.critical_alerts DESC, sp.average_grade ASC
     LIMIT 50`,
    [school_id]
  );

  return { summary: summary.rows[0], byClass: byClass.rows, atRisk: atRisk.rows };
}

// GET /api/dashboard/export/pdf
router.get('/export/pdf', requireAdmin, async (req, res, next) => {
  try {
    const data = await fetchReportData(req.user.school_id);
    generateReportPDF(res, { ...data, generatedAt: new Date().toISOString().split('T')[0] });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/export/excel
router.get('/export/excel', requireAdmin, async (req, res, next) => {
  try {
    const data = await fetchReportData(req.user.school_id);
    await generateReportExcel(res, { ...data, generatedAt: new Date().toISOString().split('T')[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
