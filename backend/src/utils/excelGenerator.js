import ExcelJS from 'exceljs';

const PURPLE_ARGB = 'FF667EEA';
const DARK_ARGB   = 'FF2C3E50';
const GREEN_ARGB  = 'FF27AE60';
const ORANGE_ARGB = 'FFF39C12';
const RED_ARGB    = 'FFE74C3C';
const LIGHT_ARGB  = 'FFF8F9FA';

function headerStyle(color = PURPLE_ARGB) {
  return {
    font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: color } },
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: { bottom: { style: 'medium', color: { argb: 'FFE0E0E0' } } },
  };
}

function applyBorder(cell) {
  cell.border = {
    left:   { style: 'thin', color: { argb: 'FFE0E0E0' } },
    right:  { style: 'thin', color: { argb: 'FFE0E0E0' } },
    bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
  };
}

export async function generateReportExcel(res, { summary, byClass, atRisk, generatedAt }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Review360N';
  workbook.created = new Date(generatedAt);

  // ── Feuille 1 : Synthèse ─────────────────────────────────────────────────
  const sheetSynthese = workbook.addWorksheet('Synthèse');
  sheetSynthese.columns = [
    { key: 'label', width: 30 },
    { key: 'value', width: 20 },
  ];

  const titleRow = sheetSynthese.addRow(['Review360N — Rapport de suivi BTS MCO', '']);
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF667EEA' } };
  titleRow.height = 26;

  sheetSynthese.addRow([`Généré le ${new Date(generatedAt).toLocaleDateString('fr-FR')}`, '']);
  sheetSynthese.addRow([]);

  const kpiHeader = sheetSynthese.addRow(['Indicateur', 'Valeur']);
  ['A', 'B'].forEach((col) => {
    const cell = kpiHeader.getCell(col);
    Object.assign(cell, headerStyle());
  });
  kpiHeader.height = 20;

  const validatedPct = summary.total_sheets
    ? Math.round((summary.validated_sheets / summary.total_sheets) * 100)
    : 0;

  const kpis = [
    ['Étudiants suivis',    summary.total_students],
    ['Total fiches',        summary.total_sheets],
    ['Fiches validées',     summary.validated_sheets],
    ['Taux de validation',  `${validatedPct}%`],
    ['Moyenne générale',    summary.global_avg ? `${summary.global_avg}/10` : '—'],
    ['Étudiants à risque',  summary.at_risk_students],
  ];

  kpis.forEach(([label, value], i) => {
    const row = sheetSynthese.addRow([label, value]);
    row.height = 18;
    if (i % 2 === 0) {
      row.getCell('A').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_ARGB } };
      row.getCell('B').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_ARGB } };
    }
    applyBorder(row.getCell('A'));
    applyBorder(row.getCell('B'));
  });

  // ── Feuille 2 : Par classe ────────────────────────────────────────────────
  const sheetClasses = workbook.addWorksheet('Par classe');
  sheetClasses.columns = [
    { header: 'Classe',      key: 'class_name',   width: 16 },
    { header: 'Formateur',   key: 'teacher_name', width: 22 },
    { header: 'Étudiants',  key: 'students',     width: 12 },
    { header: 'Moy. /10',   key: 'avg_grade',    width: 12 },
    { header: 'Progression', key: 'progress_pct', width: 14 },
    { header: 'Alertes',     key: 'active_alerts',width: 10 },
  ];

  const headerRow = sheetClasses.getRow(1);
  headerRow.height = 22;
  ['A','B','C','D','E','F'].forEach((col) => {
    Object.assign(headerRow.getCell(col), headerStyle(DARK_ARGB));
  });

  byClass.forEach((row, i) => {
    const r = sheetClasses.addRow({
      class_name:   row.class_name,
      teacher_name: row.teacher_name || '—',
      students:     row.students,
      avg_grade:    row.avg_grade ? `${parseFloat(row.avg_grade).toFixed(1)}/10` : '—',
      progress_pct: `${row.progress_pct || 0}%`,
      active_alerts: row.active_alerts || 0,
    });
    r.height = 18;
    if (i % 2 === 0) {
      ['A','B','C','D','E','F'].forEach((col) => {
        r.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_ARGB } };
      });
    }

    const alertCell = r.getCell('F');
    const alertCount = parseInt(row.active_alerts, 10) || 0;
    alertCell.font = { bold: alertCount > 0, color: { argb: alertCount > 0 ? RED_ARGB : GREEN_ARGB } };
    ['A','B','C','D','E','F'].forEach((col) => applyBorder(r.getCell(col)));
  });

  // ── Feuille 3 : Étudiants à risque ───────────────────────────────────────
  const sheetRisk = workbook.addWorksheet('Étudiants à risque');
  sheetRisk.columns = [
    { header: 'Nom',        key: 'last_name',     width: 18 },
    { header: 'Prénom',     key: 'first_name',    width: 18 },
    { header: 'N° étudiant',key: 'student_number',width: 14 },
    { header: 'Classe',     key: 'class_name',    width: 14 },
    { header: 'Moy. /10',  key: 'average_grade', width: 12 },
    { header: 'ADOC',       key: 'adoc',          width: 10 },
    { header: 'DRCV',       key: 'drcv',          width: 10 },
    { header: 'Alertes',    key: 'alerts',         width: 10 },
  ];

  const riskHeader = sheetRisk.getRow(1);
  riskHeader.height = 22;
  ['A','B','C','D','E','F','G','H'].forEach((col) => {
    Object.assign(riskHeader.getCell(col), headerStyle(RED_ARGB));
  });

  (atRisk || []).forEach((s, i) => {
    const avg = parseFloat(s.average_grade);
    const r = sheetRisk.addRow({
      last_name:     s.last_name,
      first_name:    s.first_name,
      student_number: s.student_number,
      class_name:    s.class_name || '—',
      average_grade: isNaN(avg) ? '—' : `${avg.toFixed(1)}/10`,
      adoc:          `${s.adoc_validated ?? 0}/5`,
      drcv:          `${s.drcv_validated ?? 0}/4`,
      alerts:        s.critical_alerts || 0,
    });
    r.height = 18;
    r.getCell('A').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FFFFF5F5' : 'FFFFFFFF' } };
    ['A','B','C','D','E','F','G','H'].forEach((col) => applyBorder(r.getCell(col)));
  });

  if (!atRisk || atRisk.length === 0) {
    sheetRisk.addRow(['Aucun étudiant à risque détecté', '', '', '', '', '', '', ''])
             .getCell('A').font = { color: { argb: GREEN_ARGB }, italic: true };
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="rapport-review360-${generatedAt}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
}
