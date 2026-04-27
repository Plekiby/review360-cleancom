import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const REPORT_TYPES = [
  { id: 'quarterly',  icon: '📋', label: 'Rapport trimestriel' },
  { id: 'by_class',   icon: '🏫', label: 'Par classe' },
  { id: 'by_teacher', icon: '👨‍🏫', label: 'Par formateur' },
  { id: 'alerts',     icon: '🚨', label: 'Rapport alertes' },
];

const ALERT_BADGES = {
  VERT:   'badge-success',
  ORANGE: 'badge-warning',
  ROUGE:  'badge-danger',
};

export default function AdminReports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeReport, setActiveReport] = useState('quarterly');
  const [exporting, setExporting] = useState(null);

  useEffect(() => {
    api.getReports().then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleExport = async (format) => {
    setExporting(format);
    try {
      const url = format === 'pdf' ? await api.exportPDF() : await api.exportExcel();
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport-review360.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Erreur export : ${err.message}`);
    } finally {
      setExporting(null);
    }
  };

  if (loading) return <div className="info-card">Chargement...</div>;

  const summary = data?.summary;
  const byClass = data?.by_class || [];
  const bySheetType = data?.by_sheet_type || [];
  const byTeacher = data?.by_teacher || [];
  const alertsBreakdown = data?.alerts_breakdown || [];

  const validatedPct = summary
    ? Math.round((summary.validated_sheets / (summary.total_sheets || 1)) * 100)
    : 0;

  const adoc = bySheetType.find((b) => b.sheet_type === 'ADOC');
  const drcv = bySheetType.find((b) => b.sheet_type === 'DRCV');

  return (
    <>
      {/* Cards types de rapports */}
      <div className="report-cards-grid">
        {REPORT_TYPES.map((rt) => (
          <div
            key={rt.id}
            className={`report-card ${activeReport === rt.id ? 'active' : ''}`}
            onClick={() => setActiveReport(rt.id)}
          >
            <div className="report-icon">{rt.icon}</div>
            <h4>{rt.label}</h4>
          </div>
        ))}
      </div>

      <div className="info-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3>📄 {REPORT_TYPES.find((r) => r.id === activeReport)?.label}</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-danger" onClick={() => handleExport('pdf')} disabled={!!exporting}>
              {exporting === 'pdf' ? 'Génération...' : '⬇️ PDF'}
            </button>
            <button className="btn btn-success" onClick={() => handleExport('excel')} disabled={!!exporting}>
              {exporting === 'excel' ? 'Génération...' : '⬇️ Excel'}
            </button>
          </div>
        </div>

        {/* Synthèse globale (toujours affichée en haut) */}
        {summary && (
          <div className="stats-grid" style={{ marginBottom: 20 }}>
            <div className="stat-box info">
              <div className="stat-value">{summary.total_students}</div>
              <div className="stat-label">Étudiants suivis</div>
            </div>
            <div className="stat-box success">
              <div className="stat-value">{summary.validated_sheets}</div>
              <div className="stat-label">Fiches validées ({validatedPct}%)</div>
            </div>
            <div className="stat-box purple">
              <div className="stat-value">{summary.global_avg ?? '—'}</div>
              <div className="stat-label">Moyenne générale</div>
            </div>
            <div className="stat-box danger">
              <div className="stat-value">{summary.at_risk_students}</div>
              <div className="stat-label">Étudiants à risque</div>
            </div>
          </div>
        )}

        {/* ===== RAPPORT TRIMESTRIEL ===== */}
        {activeReport === 'quarterly' && (
          <>
            {(adoc || drcv) && (
              <div style={{ marginTop: 20 }}>
                <h4 style={{ marginBottom: 12, fontSize: '0.9rem' }}>Analyse par compétence</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <SheetTypeBlock label="ADOC" data={adoc} color="#3498db" bg="#f0f8ff" />
                  <SheetTypeBlock label="DRCV" data={drcv} color="#f39c12" bg="#fffbf0" />
                </div>
              </div>
            )}

            {summary?.at_risk_students > 0 && (
              <div className="alert-banner warning" style={{ marginTop: 16 }}>
                ⚠️ {summary.at_risk_students} étudiant{summary.at_risk_students > 1 ? 's' : ''} nécessite{summary.at_risk_students > 1 ? 'nt' : ''} un suivi renforcé.
                Planifier des entretiens individuels avant la fin du trimestre.
              </div>
            )}
          </>
        )}

        {/* ===== PAR CLASSE ===== */}
        {activeReport === 'by_class' && byClass.length > 0 && (
          <>
            <h4 style={{ marginBottom: 12, fontSize: '0.9rem' }}>Comparatif par classe</h4>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Classe</th>
                    <th>Formateur</th>
                    <th>Étudiants</th>
                    <th>Note moy.</th>
                    <th>Progression</th>
                    <th>Alertes</th>
                  </tr>
                </thead>
                <tbody>
                  {byClass.map((c, i) => (
                    <tr key={i}>
                      <td><strong>{c.class_name}</strong></td>
                      <td style={{ fontSize: '0.82rem' }}>{c.teacher_name || '—'}</td>
                      <td>{c.students}</td>
                      <td className={c.avg_grade >= 8 ? 'grade-high' : c.avg_grade >= 6 ? 'grade-medium' : 'grade-low'}>
                        {c.avg_grade ?? '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="progress-bar" style={{ flex: 1, margin: 0 }}>
                            <div
                              className={`progress-bar-fill ${c.progress_pct >= 80 ? 'success' : c.progress_pct >= 40 ? 'warning' : 'danger'}`}
                              style={{ width: `${c.progress_pct || 0}%` }}
                            />
                          </div>
                          <span style={{ fontSize: '0.78rem', minWidth: 32 }}>{c.progress_pct ?? 0}%</span>
                        </div>
                      </td>
                      <td>
                        {c.active_alerts > 0
                          ? <span className="badge badge-danger">{c.active_alerts}</span>
                          : <span className="badge badge-success">0</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ===== PAR FORMATEUR ===== */}
        {activeReport === 'by_teacher' && (
          byTeacher.length > 0 ? (
            <>
              <h4 style={{ marginBottom: 12, fontSize: '0.9rem' }}>Comparatif par formateur</h4>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Formateur</th>
                      <th>Classes</th>
                      <th>Étudiants</th>
                      <th>Validations</th>
                      <th>Fiches validées</th>
                      <th>Note moy.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byTeacher.map((t) => (
                      <tr key={t.teacher_id}>
                        <td><strong>{t.teacher_name}</strong></td>
                        <td>{t.classes_count ?? 0}</td>
                        <td>{t.students ?? 0}</td>
                        <td>{t.validations_count ?? 0}</td>
                        <td>{t.validated_sheets ?? 0}</td>
                        <td className={t.avg_grade >= 8 ? 'grade-high' : t.avg_grade >= 6 ? 'grade-medium' : 'grade-low'}>
                          {t.avg_grade ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p style={{ color: '#7f8c8d', textAlign: 'center', padding: 20 }}>Aucun formateur actif.</p>
          )
        )}

        {/* ===== RAPPORT ALERTES ===== */}
        {activeReport === 'alerts' && (
          alertsBreakdown.length > 0 ? (
            <>
              <h4 style={{ marginBottom: 12, fontSize: '0.9rem' }}>Répartition des alertes actives</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
                {alertsBreakdown.map((a) => (
                  <div key={a.alert_type} style={{ background: '#f8f9fa', borderRadius: 8, padding: 14, borderLeft: `4px solid ${a.alert_type === 'ROUGE' ? '#e74c3c' : a.alert_type === 'ORANGE' ? '#f39c12' : '#27ae60'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span className={`badge ${ALERT_BADGES[a.alert_type]}`}>{a.alert_type}</span>
                      <span style={{ fontSize: '1.4rem', fontWeight: 700 }}>{a.count}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#7f8c8d' }}>
                      dont {a.recent} sur les 7 derniers jours
                    </div>
                  </div>
                ))}
              </div>
              <div className="alert-banner warning">
                ℹ️ Pour résoudre une alerte, ouvrez la fiche de l'étudiant concerné depuis "Détail Classes" → onglet Alertes.
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>✅</div>
              <p style={{ color: '#27ae60', fontWeight: 600 }}>Aucune alerte active</p>
              <p style={{ color: '#7f8c8d', fontSize: '0.85rem' }}>Tous les étudiants sont à jour.</p>
            </div>
          )
        )}
      </div>
    </>
  );
}

function SheetTypeBlock({ label, data, color, bg }) {
  if (!data) {
    return (
      <div style={{ background: bg, borderRadius: 8, padding: 14 }}>
        <div style={{ fontWeight: 600, color, marginBottom: 8 }}>
          {label === 'ADOC' ? '📘' : '📙'} {label}
        </div>
        <div style={{ fontSize: '0.84rem', color: '#aaa' }}>Aucune donnée.</div>
      </div>
    );
  }
  const total = parseInt(data.total, 10) || 0;
  const validated = parseInt(data.validated, 10) || 0;
  const inProgress = parseInt(data.in_progress, 10) || 0;
  const notStarted = parseInt(data.not_started, 10) || 0;
  const pct = total ? Math.round((validated / total) * 100) : 0;
  const expectedPerStudent = label === 'ADOC' ? 5 : 4;
  return (
    <div style={{ background: bg, borderRadius: 8, padding: 14 }}>
      <div style={{ fontWeight: 600, color, marginBottom: 8 }}>
        {label === 'ADOC' ? '📘' : '📙'} {label} ({expectedPerStudent} fiches/étudiant)
      </div>
      <div style={{ fontSize: '0.84rem', lineHeight: 2 }}>
        <div>Total créées : <strong>{total}</strong></div>
        <div>Validées : <strong style={{ color: '#27ae60' }}>{validated}</strong> ({pct}%)</div>
        <div>En cours : <strong style={{ color: '#f39c12' }}>{inProgress}</strong></div>
        <div>Non démarrées : <strong style={{ color: '#7f8c8d' }}>{notStarted}</strong></div>
      </div>
    </div>
  );
}
