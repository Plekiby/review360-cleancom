import PDFDocument from 'pdfkit';

const PURPLE = '#667eea';
const DARK   = '#2c3e50';
const GREEN  = '#27ae60';
const ORANGE = '#f39c12';
const RED    = '#e74c3c';
const GREY   = '#7f8c8d';
const LIGHT  = '#f8f9fa';

export function generateReportPDF(res, { summary, byClass, generatedAt }) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="rapport-review360-${generatedAt}.pdf"`);
  doc.pipe(res);

  // ── Header band ──────────────────────────────────────────────────────────
  doc.rect(0, 0, doc.page.width, 80).fill(PURPLE);
  doc.fill('white').fontSize(20).font('Helvetica-Bold')
     .text('Review360N', 40, 24);
  doc.fontSize(10).font('Helvetica')
     .text('Système de Suivi BTS MCO', 40, 48);
  doc.fontSize(9).text(`Rapport généré le ${new Date(generatedAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`, { align: 'right' });

  doc.moveDown(3);

  // ── KPI boxes ────────────────────────────────────────────────────────────
  const kpis = [
    { label: 'Étudiants suivis',   value: summary.total_students,   color: '#3498db' },
    { label: 'Fiches validées',    value: summary.validated_sheets,  color: GREEN },
    { label: 'Moyenne générale',   value: `${summary.global_avg ?? '—'}/10`, color: PURPLE },
    { label: 'Étudiants à risque', value: summary.at_risk_students,  color: RED },
  ];

  const boxW = 115;
  const boxH = 52;
  const startX = 40;
  const y = doc.y;

  kpis.forEach((k, i) => {
    const x = startX + i * (boxW + 8);
    doc.rect(x, y, boxW, boxH).fill(LIGHT);
    doc.rect(x, y, 4, boxH).fill(k.color);
    doc.fill(DARK).fontSize(20).font('Helvetica-Bold')
       .text(String(k.value), x + 12, y + 6, { width: boxW - 16 });
    doc.fill(GREY).fontSize(8).font('Helvetica')
       .text(k.label, x + 12, y + 32, { width: boxW - 16 });
  });

  doc.y = y + boxH + 20;

  // ── Taux de validation ────────────────────────────────────────────────────
  const validatedPct = summary.total_sheets
    ? Math.round((summary.validated_sheets / summary.total_sheets) * 100)
    : 0;

  doc.fill(DARK).fontSize(11).font('Helvetica-Bold').text('Taux de validation global');
  doc.moveDown(0.3);
  const barY = doc.y;
  doc.rect(40, barY, 515, 14).fill('#e0e0e0');
  doc.rect(40, barY, Math.round(515 * validatedPct / 100), 14)
     .fill(validatedPct >= 80 ? GREEN : validatedPct >= 40 ? ORANGE : RED);
  doc.fill('white').fontSize(8).font('Helvetica-Bold')
     .text(`${validatedPct}%`, 40, barY + 2, { width: 515, align: 'center' });
  doc.y = barY + 24;

  // ── Tableau par classe ────────────────────────────────────────────────────
  doc.moveDown(0.8);
  doc.fill(DARK).fontSize(11).font('Helvetica-Bold').text('Résultats par classe');
  doc.moveDown(0.4);

  const tableTop = doc.y;
  const cols = [
    { label: 'Classe',      x: 40,  w: 80  },
    { label: 'Formateur',   x: 124, w: 130 },
    { label: 'Étudiants',  x: 258, w: 60  },
    { label: 'Moy.',        x: 322, w: 50  },
    { label: 'Progression', x: 376, w: 100 },
    { label: 'Alertes',     x: 480, w: 50  },
  ];

  // Header row
  doc.rect(40, tableTop, 515, 18).fill(DARK);
  cols.forEach((c) => {
    doc.fill('white').fontSize(8).font('Helvetica-Bold')
       .text(c.label, c.x + 4, tableTop + 4, { width: c.w });
  });

  byClass.forEach((row, i) => {
    const rowY = tableTop + 18 + i * 20;
    doc.rect(40, rowY, 515, 20).fill(i % 2 === 0 ? LIGHT : 'white');

    // Progress bar inside cell
    const pct = row.progress_pct || 0;
    const barColor = pct >= 80 ? GREEN : pct >= 40 ? ORANGE : RED;

    doc.fill(DARK).fontSize(8).font('Helvetica-Bold').text(row.class_name, cols[0].x + 4, rowY + 5, { width: cols[0].w });
    doc.font('Helvetica').text(row.teacher_name || '—', cols[1].x + 4, rowY + 5, { width: cols[1].w });
    doc.text(String(row.students), cols[2].x + 4, rowY + 5, { width: cols[2].w });

    const avg = parseFloat(row.avg_grade);
    doc.fill(isNaN(avg) ? GREY : avg >= 8 ? GREEN : avg >= 6 ? ORANGE : RED)
       .text(isNaN(avg) ? '—' : `${avg.toFixed(1)}/10`, cols[3].x + 4, rowY + 5, { width: cols[3].w });

    // mini bar
    doc.rect(cols[4].x + 4, rowY + 7, 80, 6).fill('#e0e0e0');
    doc.rect(cols[4].x + 4, rowY + 7, Math.round(80 * pct / 100), 6).fill(barColor);
    doc.fill(DARK).text(`${pct}%`, cols[4].x + 86, rowY + 5, { width: 14 });

    const alerts = parseInt(row.active_alerts, 10) || 0;
    doc.fill(alerts > 0 ? RED : GREEN).font('Helvetica-Bold')
       .text(String(alerts), cols[5].x + 4, rowY + 5, { width: cols[5].w });
  });

  doc.y = tableTop + 18 + byClass.length * 20 + 20;

  // ── Footer ────────────────────────────────────────────────────────────────
  doc.fontSize(7).fill(GREY).font('Helvetica')
     .text('Review360N — Système de Suivi BTS MCO — Document confidentiel', 40, doc.page.height - 30, { align: 'center', width: 515 });

  doc.end();
}
