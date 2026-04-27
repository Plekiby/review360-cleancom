import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import ImportStudents from './ImportStudents';
import StudentDetail from './StudentDetail';
import SessionForm from './SessionForm';

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

export default function AdminClassDetail({ initialClassId, onConsumeInitial }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [escaladeStudent, setEscaladeStudent] = useState(null);
  const [convoquerStudent, setConvoquerStudent] = useState(null);

  useEffect(() => {
    api.getClasses().then((cls) => {
      setClasses(cls);
      if (cls.length > 0) {
        // Si on arrive depuis Monitoring avec une classe pré-sélectionnée, on l'utilise
        const preselect = initialClassId && cls.find((c) => c.id === initialClassId)
          ? initialClassId
          : cls[0].id;
        setSelectedClass(preselect);
        if (initialClassId && onConsumeInitial) onConsumeInitial();
      }
      setLoading(false);
    }).catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si initialClassId change pendant qu'on est sur la page (ex: clic répété)
  useEffect(() => {
    if (initialClassId && classes.find((c) => c.id === initialClassId) && initialClassId !== selectedClass) {
      setSelectedClass(initialClassId);
      if (onConsumeInitial) onConsumeInitial();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialClassId]);

  useEffect(() => {
    if (!selectedClass) return;
    api.getClassStudents(selectedClass).then(setStudents);
  }, [selectedClass]);

  const refreshStudents = () => {
    if (selectedClass) api.getClassStudents(selectedClass).then(setStudents);
  };

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
            // Ne pas fermer ici — ImportStudents affiche l'écran de succès,
            // l'utilisateur ferme lui-même via le bouton "Fermer".
            // On recharge simplement les étudiants en arrière-plan.
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
                      <td>
                        <button className="btn btn-primary" style={{ marginRight: 6 }} onClick={() => setConvoquerStudent(s)}>Convoquer</button>
                        <button className="btn btn-warning" onClick={() => setEscaladeStudent(s)}>
                          Escalader
                        </button>
                      </td>
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

      {selectedStudent && (
        <StudentDetail
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}

      {convoquerStudent && (
        <ConvoquerForm
          student={convoquerStudent}
          onClose={() => setConvoquerStudent(null)}
          onSaved={() => { setConvoquerStudent(null); refreshStudents(); }}
        />
      )}

      {escaladeStudent && (
        <EscaladeForm
          student={escaladeStudent}
          onClose={() => setEscaladeStudent(null)}
          onEscalated={() => { setEscaladeStudent(null); refreshStudents(); }}
        />
      )}
    </>
  );
}

function ConvoquerForm({ student, onClose, onSaved }) {
  const [sheets, setSheets] = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    api.getActivitySheets(student.id)
      .then((all) => setSheets(all.filter((s) => s.status !== 'validated')))
      .catch(() => setLoadError('Impossible de charger les fiches de cet étudiant.'));
  }, [student.id]);

  if (loadError) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 10, padding: 24, maxWidth: 380 }}>
        <p style={{ color: '#e74c3c', marginBottom: 16 }}>{loadError}</p>
        <button className="btn btn-outline" onClick={onClose}>Fermer</button>
      </div>
    </div>
  );

  if (!sheets) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
      <div style={{ background: 'white', borderRadius: 10, padding: 32, fontSize: '0.9rem', color: '#7f8c8d' }}>Chargement des fiches...</div>
    </div>
  );

  return (
    <SessionForm
      student={student}
      sheets={sheets}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

const REASON_PRESETS = [
  'Pas de réponse aux relances',
  'Qualité des fiches insuffisante',
  'Absences répétées en sessions',
  'Risque de décrochage',
];

function EscaladeForm({ student, onClose, onEscalated }) {
  const [preset, setPreset] = useState(REASON_PRESETS[0]);
  const [customReason, setCustomReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [existingAlerts, setExistingAlerts] = useState(null);

  useEffect(() => {
    api.getAlerts({ studentId: student.id })
      .then((al) => setExistingAlerts(al))
      .catch(() => setExistingAlerts([]));
  }, [student.id]);

  const isCustom = preset === 'custom';
  const finalReason = (isCustom ? customReason : preset).trim();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!finalReason) {
      setError('Indiquez la raison de l\'escalade.');
      return;
    }
    const fullReason = details.trim() ? `${finalReason} — ${details.trim()}` : finalReason;
    setSubmitting(true);
    try {
      await api.createAlert({ student_id: student.id, reason: fullReason });
      onEscalated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const existingCount = existingAlerts?.length ?? null;

  return (
    <div style={escOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={escModal}>
        <div style={escHeader}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>
              🚨 Escalader en alerte ROUGE
            </div>
            <div style={{ fontSize: '0.82rem', opacity: 0.85 }}>
              {student.last_name} {student.first_name} · N° {student.student_number}
            </div>
          </div>
          <button onClick={onClose} style={escCloseBtn}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          {existingCount !== null && (
            <div style={{
              background: existingCount > 0 ? '#fff5f5' : '#f0fdf4',
              border: `1px solid ${existingCount > 0 ? '#e74c3c' : '#27ae60'}`,
              borderRadius: 6, padding: '8px 12px', marginBottom: 16,
              fontSize: '0.84rem',
            }}>
              {existingCount > 0
                ? `⚠️ ${existingCount} alerte${existingCount > 1 ? 's' : ''} déjà active${existingCount > 1 ? 's' : ''} sur cet étudiant.`
                : '✅ Aucune alerte active actuellement.'}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>Motif de l'escalade *</label>
            {REASON_PRESETS.map((r) => (
              <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="preset"
                  value={r}
                  checked={preset === r}
                  onChange={(e) => setPreset(e.target.value)}
                />
                <span style={{ fontSize: '0.88rem' }}>{r}</span>
              </label>
            ))}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer' }}>
              <input
                type="radio"
                name="preset"
                value="custom"
                checked={preset === 'custom'}
                onChange={(e) => setPreset(e.target.value)}
              />
              <span style={{ fontSize: '0.88rem' }}>Autre motif (préciser)</span>
            </label>
            {isCustom && (
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="ex: Conflit avec l'entreprise d'accueil"
                style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #e0e0e0', marginTop: 6, fontSize: '0.88rem', boxSizing: 'border-box' }}
                autoFocus
              />
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Détails complémentaires <span style={{ color: '#aaa', fontWeight: 400 }}>(optionnel)</span>
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Contexte, dates clés, actions déjà tentées..."
              rows={3}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #e0e0e0', resize: 'vertical', fontFamily: 'inherit', fontSize: '0.88rem', boxSizing: 'border-box' }}
            />
          </div>

          {error && <div className="alert-banner danger" style={{ marginBottom: 12 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-danger" style={{ flex: 2, fontWeight: 600 }} disabled={submitting}>
              {submitting ? 'Création...' : '🚨 Confirmer l\'escalade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const escOverlay = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1100, padding: 16,
};
const escModal = {
  background: 'white', borderRadius: 10,
  width: '100%', maxWidth: 520,
  maxHeight: '90vh',
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  overflow: 'hidden',
  display: 'flex', flexDirection: 'column',
};
const escHeader = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '14px 18px',
  background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
  color: 'white',
};
const escCloseBtn = { background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer' };
