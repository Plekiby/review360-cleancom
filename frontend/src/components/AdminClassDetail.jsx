import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import ImportStudents from './ImportStudents';

const MEDALS = ['🥇', '🥈', '🥉'];

function progressColor(pct) {
  if (pct >= 80) return 'success';
  if (pct >= 40) return 'warning';
  return 'danger';
}

function gradeClass(g) {
  if (g >= 8) return 'grade-high';
  if (g >= 6) return 'grade-medium';
  return 'grade-low';
}

export default function AdminClassDetail() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    api.getClasses().then((cls) => {
      setClasses(cls);
      if (cls.length > 0) setSelectedClass(cls[0].id);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    api.getClassStudents(selectedClass).then(setStudents);
  }, [selectedClass]);

  if (loading) return <div className="info-card">Chargement...</div>;

  const currentClass = classes.find((c) => c.id === selectedClass);

  // Progression ADOC (5 fiches) et DRCV (4 fiches)
  const adocProgress = Array.from({ length: 5 }, (_, i) => {
    const validated = students.filter((s) => (s.adoc_validated ?? 0) > i).length;
    return { label: `ADOC ${i + 1}`, pct: students.length ? Math.round((validated / students.length) * 100) : 0 };
  });
  const drcvProgress = Array.from({ length: 4 }, (_, i) => {
    const validated = students.filter((s) => (s.drcv_validated ?? 0) > i).length;
    return { label: `DRCV ${i + 1}`, pct: students.length ? Math.round((validated / students.length) * 100) : 0 };
  });

  const avgGrade = students.length
    ? (students.reduce((s, st) => s + (parseFloat(st.average_grade) || 0), 0) / students.length).toFixed(1)
    : '—';
  const totalProgress = students.length
    ? Math.round((students.reduce((s, st) => s + (st.adoc_validated ?? 0) + (st.drcv_validated ?? 0), 0) / (students.length * 9)) * 100)
    : 0;
  const atRisk = students.filter((s) => s.critical_alerts > 0 || parseFloat(s.average_grade) < 6);
  const topPerformers = [...students]
    .filter((s) => s.average_grade)
    .sort((a, b) => parseFloat(b.average_grade) - parseFloat(a.average_grade))
    .slice(0, 3);

  return (
    <>
      {/* Sélecteur de classe */}
      <div className="info-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: 600 }}>Classe :</label>
          <select value={selectedClass || ''} onChange={(e) => setSelectedClass(e.target.value)} style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #e0e0e0' }}>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.teacher_name}</option>)}
          </select>
          <span className="badge badge-info">{students.length} étudiants</span>
          <span className="badge badge-success">{avgGrade}/10 moy.</span>
          <span className="badge badge-warning">{totalProgress}% progression</span>
          {atRisk.length > 0 && <span className="badge badge-danger">{atRisk.length} en alerte</span>}
          <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setShowImport(true)}>
            📥 Importer étudiants
          </button>
        </div>
      </div>

      {showImport && (
        <ImportStudents
          classes={classes}
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false);
            api.getClassStudents(selectedClass).then(setStudents);
          }}
        />
      )}

      {/* Grid ADOC + DRCV progression */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="info-card" style={{ margin: 0 }}>
          <h3 style={{ color: '#3498db' }}>📘 Progression ADOC</h3>
          {adocProgress.map((f) => (
            <div key={f.label} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 3 }}>
                <span>{f.label}</span><span>{f.pct}%</span>
              </div>
              <div className="progress-bar">
                <div className={`progress-bar-fill ${progressColor(f.pct)}`} style={{ width: `${f.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="info-card" style={{ margin: 0 }}>
          <h3 style={{ color: '#f39c12' }}>📙 Progression DRCV</h3>
          {drcvProgress.map((f) => (
            <div key={f.label} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 3 }}>
                <span>{f.label}</span><span>{f.pct}%</span>
              </div>
              <div className="progress-bar">
                <div className={`progress-bar-fill ${progressColor(f.pct)}`} style={{ width: `${f.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Étudiants en difficulté */}
      {atRisk.length > 0 && (
        <div className="info-card">
          <h3>⚠️ Étudiants en difficulté</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Étudiant</th>
                  <th>Moyenne</th>
                  <th>ADOC</th>
                  <th>DRCV</th>
                  <th>Dernier suivi</th>
                  <th>Problème</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {atRisk.map((s) => {
                  const grade = parseFloat(s.average_grade);
                  const isCritical = s.critical_alerts > 0;
                  return (
                    <tr key={s.id} className={isCritical ? 'urgent' : 'warn'}>
                      <td><strong>{s.last_name} {s.first_name}</strong></td>
                      <td className={gradeClass(grade)}>{isNaN(grade) ? '—' : `${grade.toFixed(1)}/10`}</td>
                      <td>{s.adoc_validated ?? 0}/5</td>
                      <td>{s.drcv_validated ?? 0}/4</td>
                      <td style={{ fontSize: '0.8rem' }}>{s.last_session_date ? new Date(s.last_session_date).toLocaleDateString('fr-FR') : '—'}</td>
                      <td>
                        {isCritical
                          ? <span className="badge badge-danger">Alerte critique</span>
                          : <span className="badge badge-warning">Note insuffisante</span>}
                      </td>
                      <td><button className="btn btn-warning">Escalader</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top performers */}
      {topPerformers.length > 0 && (
        <div className="info-card">
          <h3>🏆 Top performers</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Rang</th>
                  <th>Étudiant</th>
                  <th>Moyenne</th>
                  <th>ADOC</th>
                  <th>DRCV</th>
                </tr>
              </thead>
              <tbody>
                {topPerformers.map((s, i) => (
                  <tr key={s.id}>
                    <td style={{ fontSize: '1.2rem' }}>{MEDALS[i] || i + 1}</td>
                    <td><strong>{s.last_name} {s.first_name}</strong></td>
                    <td className="grade-high">{parseFloat(s.average_grade).toFixed(1)}/10</td>
                    <td>{s.adoc_validated ?? 0}/5</td>
                    <td>{s.drcv_validated ?? 0}/4</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recommandations */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="info-card" style={{ borderTop: '3px solid #f39c12' }}>
          <h3>⚡ Court terme (1-2 semaines)</h3>
          <ul style={{ paddingLeft: 16, fontSize: '0.85rem', lineHeight: 1.8 }}>
            <li>Contacter les {atRisk.length} étudiants en alerte</li>
            <li>Planifier sessions de rattrapage</li>
            <li>Relancer les fiches en retard</li>
          </ul>
        </div>
        <div className="info-card" style={{ borderTop: '3px solid #3498db' }}>
          <h3>📅 Moyen terme (1 mois)</h3>
          <ul style={{ paddingLeft: 16, fontSize: '0.85rem', lineHeight: 1.8 }}>
            <li>Atelier collectif sur les objectifs DRCV</li>
            <li>Bilan mi-parcours avec le responsable</li>
            <li>Réajustement du planning de validation</li>
          </ul>
        </div>
      </div>
    </>
  );
}
