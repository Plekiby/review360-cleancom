import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const REPORT_TYPES = [
  { id: 'quarterly', icon: '📋', label: 'Rapport trimestriel' },
  { id: 'by_class', icon: '🏫', label: 'Par classe' },
  { id: 'by_teacher', icon: '👨‍🏫', label: 'Par formateur' },
  { id: 'alerts', icon: '🚨', label: 'Rapport alertes' },
];

export default function AdminReports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeReport, setActiveReport] = useState('quarterly');

  useEffect(() => {
    api.getReports().then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleExport = (format) => {
    alert(`Export ${format.toUpperCase()} — fonctionnalité disponible après connexion au backend`);
  };

  if (loading) return <div className="info-card">Chargement...</div>;

  const summary = data?.summary;
  const byClass = data?.by_class || [];

  const validatedPct = summary
    ? Math.round((summary.validated_sheets / (summary.total_sheets || 1)) * 100)
    : 0;

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

      {/* Preview rapport */}
      <div className="info-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3>📄 {REPORT_TYPES.find((r) => r.id === activeReport)?.label}</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-danger" onClick={() => handleExport('pdf')}>⬇️ PDF</button>
            <button className="btn btn-success" onClick={() => handleExport('excel')}>⬇️ Excel</button>
          </div>
        </div>

        {/* Synthèse */}
        {summary && (
          <>
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

            {/* Tableau comparatif classes */}
            {byClass.length > 0 && (
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
                          <td style={{ fontSize: '0.82rem' }}>{c.teacher_name}</td>
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

            {/* Analyse par compétence */}
            <div style={{ marginTop: 20 }}>
              <h4 style={{ marginBottom: 12, fontSize: '0.9rem' }}>Analyse par compétence</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ background: '#f0f8ff', borderRadius: 8, padding: 14 }}>
                  <div style={{ fontWeight: 600, color: '#3498db', marginBottom: 8 }}>📘 ADOC (5 fiches)</div>
                  <div style={{ fontSize: '0.84rem', lineHeight: 2 }}>
                    <div>Fiches complétées : <strong>{summary.validated_sheets ? Math.round(summary.validated_sheets * 0.55) : '—'}</strong></div>
                    <div>En cours : <strong>{summary.total_sheets ? Math.round(summary.total_sheets * 0.3) : '—'}</strong></div>
                    <div>Non démarrées : <strong>{summary.total_sheets ? Math.round(summary.total_sheets * 0.15) : '—'}</strong></div>
                  </div>
                </div>
                <div style={{ background: '#fffbf0', borderRadius: 8, padding: 14 }}>
                  <div style={{ fontWeight: 600, color: '#f39c12', marginBottom: 8 }}>📙 DRCV (4 fiches)</div>
                  <div style={{ fontSize: '0.84rem', lineHeight: 2 }}>
                    <div>Fiches complétées : <strong>{summary.validated_sheets ? Math.round(summary.validated_sheets * 0.45) : '—'}</strong></div>
                    <div>En cours : <strong>{summary.total_sheets ? Math.round(summary.total_sheets * 0.28) : '—'}</strong></div>
                    <div>Non démarrées : <strong>{summary.total_sheets ? Math.round(summary.total_sheets * 0.27) : '—'}</strong></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Points d'attention */}
            {summary.at_risk_students > 0 && (
              <div className="alert-banner warning" style={{ marginTop: 16 }}>
                ⚠️ {summary.at_risk_students} étudiant{summary.at_risk_students > 1 ? 's' : ''} nécessite{summary.at_risk_students > 1 ? 'nt' : ''} un suivi renforcé.
                Planifier des entretiens individuels avant la fin du trimestre.
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
