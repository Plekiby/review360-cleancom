import { useEffect, useState } from 'react';
import { api } from '../lib/api';

function classCardStatus(cls) {
  if (cls.adoc_pct >= 100 && cls.drcv_pct >= 100) return 'complete';
  if (cls.adoc_pct < 40 || cls.drcv_pct < 40) return 'critical';
  if (cls.critical_alerts > 0) return 'warning';
  return '';
}

function progressColor(pct) {
  if (pct >= 80) return 'success';
  if (pct >= 40) return 'warning';
  return 'danger';
}

export default function AdminMonitoring() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSchoolDashboard().then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="info-card">Chargement...</div>;
  if (!data) return <div className="info-card">Erreur de chargement</div>;

  const { global: g, classes } = data;
  const criticalClass = classes?.find((c) => parseFloat(c.adoc_pct) < 40 || parseFloat(c.drcv_pct) < 40);

  return (
    <>
      {/* Stats globales */}
      <div className="stats-grid">
        <div className="stat-box info">
          <div className="stat-value">{g?.total_classes ?? '—'}</div>
          <div className="stat-label">Classes actives</div>
        </div>
        <div className="stat-box purple">
          <div className="stat-value">{g?.total_students ?? '—'}</div>
          <div className="stat-label">Étudiants</div>
        </div>
        <div className="stat-box success">
          <div className="stat-value">{g?.global_avg ?? '—'}</div>
          <div className="stat-label">Moyenne école /10</div>
        </div>
        <div className="stat-box danger">
          <div className="stat-value">{g?.active_alerts ?? '—'}</div>
          <div className="stat-label">Alertes actives</div>
        </div>
      </div>

      {/* Bannière critique */}
      {criticalClass && (
        <div className="alert-banner danger">
          🚨 Classe {criticalClass.class_name} en alerte critique — {criticalClass.adoc_pct}% ADOC / {criticalClass.drcv_pct}% DRCV
        </div>
      )}

      {/* Cards classes */}
      <div className="class-cards-grid">
        {(classes || []).map((cls) => {
          const status = classCardStatus(cls);
          const adocPct = parseFloat(cls.adoc_pct) || 0;
          const drcvPct = parseFloat(cls.drcv_pct) || 0;
          return (
            <div className={`class-card ${status}`} key={cls.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{cls.class_name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#7f8c8d' }}>{cls.teacher_name}</div>
                </div>
                {status === 'complete' && <span className="badge badge-success">✅ Terminée</span>}
                {status === 'critical' && <span className="badge badge-danger">🚨 Critique</span>}
                {status === 'warning' && <span className="badge badge-warning">⚠️ Attention</span>}
              </div>

              <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                <div className="stat-box info" style={{ flex: 1, padding: '8px', margin: 0 }}>
                  <div className="stat-value" style={{ fontSize: '1.4rem' }}>{cls.student_count}</div>
                  <div className="stat-label">Étudiants</div>
                </div>
                <div className="stat-box success" style={{ flex: 1, padding: '8px', margin: 0 }}>
                  <div className="stat-value" style={{ fontSize: '1.4rem' }}>{cls.avg_grade ?? '—'}</div>
                  <div className="stat-label">Moyenne</div>
                </div>
              </div>

              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 2 }}>
                  <span>ADOC</span><span>{adocPct}%</span>
                </div>
                <div className="progress-bar">
                  <div className={`progress-bar-fill ${progressColor(adocPct)}`} style={{ width: `${adocPct}%` }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 2 }}>
                  <span>DRCV</span><span>{drcvPct}%</span>
                </div>
                <div className="progress-bar">
                  <div className={`progress-bar-fill ${progressColor(drcvPct)}`} style={{ width: `${drcvPct}%` }} />
                </div>
              </div>

              {cls.critical_alerts > 0 && (
                <div style={{ marginTop: 10, fontSize: '0.78rem', color: '#e74c3c' }}>
                  ⚠️ {cls.critical_alerts} alerte{cls.critical_alerts > 1 ? 's' : ''} critique{cls.critical_alerts > 1 ? 's' : ''}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
