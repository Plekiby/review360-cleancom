import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import SessionForm from './SessionForm';
import ValidationForm from './ValidationForm';

const STATUS_LABEL = {
  not_started: { label: 'Non démarré', cls: 'badge-secondary' },
  in_progress:  { label: 'En cours',    cls: 'badge-warning' },
  completed:    { label: 'Complété',    cls: 'badge-info' },
  validated:    { label: 'Validé',      cls: 'badge-success' },
};

const SESSION_STATUS = {
  scheduled:   { label: 'Planifiée',  cls: 'badge-info' },
  completed:   { label: 'Réalisée',   cls: 'badge-success' },
  cancelled:   { label: 'Annulée',    cls: 'badge-danger' },
  rescheduled: { label: 'Reportée',   cls: 'badge-warning' },
};

export default function StudentDetail({ student, onClose }) {
  const [tab, setTab] = useState('sheets');
  const [sheets, setSheets] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [validations, setValidations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSessionForm, setShowSessionForm] = useState(null); // activitySheetId
  const [showValidationForm, setShowValidationForm] = useState(null); // validation object

  const reload = () => {
    Promise.all([
      api.getActivitySheets(student.id),
      api.getSessions({ studentId: student.id }),
      api.getValidations({ studentId: student.id }),
    ]).then(([s, sess, v]) => {
      setSheets(s);
      setSessions(sess);
      setValidations(v);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { reload(); }, [student.id]);

  const adocSheets = sheets.filter((s) => s.sheet_type === 'ADOC').sort((a, b) => a.sheet_number - b.sheet_number);
  const drcvSheets = sheets.filter((s) => s.sheet_type === 'DRCV').sort((a, b) => a.sheet_number - b.sheet_number);

  const avgGrade = validations.filter((v) => v.session_grade).length
    ? (validations.reduce((s, v) => s + (parseFloat(v.session_grade) || 0), 0) / validations.filter((v) => v.session_grade).length).toFixed(1)
    : '—';

  return (
    <>
      <div style={overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div style={modal}>
          {/* Header */}
          <div style={header}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                {student.last_name} {student.first_name}
              </div>
              <div style={{ fontSize: '0.82rem', opacity: 0.8 }}>
                N° {student.student_number} · Moyenne : {avgGrade}/10
                · ADOC {student.adoc_validated ?? 0}/5 · DRCV {student.drcv_validated ?? 0}/4
              </div>
            </div>
            <button onClick={onClose} style={closeBtn}>✕</button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '2px solid #e0e0e0', background: '#f8f9fa' }}>
            {[
              { id: 'sheets',      label: '📋 Fiches' },
              { id: 'sessions',    label: '📅 Sessions' },
              { id: 'validations', label: '✅ Validations' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: '12px 20px', border: 'none', cursor: 'pointer', fontSize: '0.88rem',
                  background: tab === t.id ? 'white' : 'transparent',
                  borderBottom: tab === t.id ? '2px solid #667eea' : '2px solid transparent',
                  fontWeight: tab === t.id ? 600 : 400,
                  color: tab === t.id ? '#667eea' : '#7f8c8d',
                  marginBottom: -2,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Contenu */}
          <div style={{ padding: 20, overflowY: 'auto', maxHeight: 'calc(80vh - 160px)' }}>
            {loading && <p style={{ color: '#7f8c8d' }}>Chargement...</p>}

            {/* ===== ONGLET FICHES ===== */}
            {!loading && tab === 'sheets' && (
              <>
                {[{ type: 'ADOC', list: adocSheets, color: '#3498db' }, { type: 'DRCV', list: drcvSheets, color: '#f39c12' }].map(({ type, list, color }) => (
                  <div key={type} style={{ marginBottom: 20 }}>
                    <h4 style={{ color, marginBottom: 10 }}>{type === 'ADOC' ? '📘' : '📙'} Fiches {type}</h4>
                    {list.map((sheet) => {
                      const st = STATUS_LABEL[sheet.status] || STATUS_LABEL.not_started;
                      const grade = parseFloat(sheet.avg_grade);
                      return (
                        <div key={sheet.id} style={sheetRow}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                            <span style={{ fontWeight: 600, minWidth: 70, color }}>{type} {sheet.sheet_number}</span>
                            <span className={`badge ${st.cls}`}>{st.label}</span>
                            {sheet.title && <span style={{ fontSize: '0.82rem', color: '#7f8c8d' }}>{sheet.title}</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {!isNaN(grade) && (
                              <span style={{ fontWeight: 600, color: grade >= 8 ? '#27ae60' : grade >= 6 ? '#f39c12' : '#e74c3c' }}>
                                {grade.toFixed(1)}/10
                              </span>
                            )}
                            <span style={{ fontSize: '0.78rem', color: '#aaa' }}>{sheet.sessions_count || 0} session(s)</span>
                            {sheet.status !== 'validated' && (
                              <button
                                className="btn btn-primary"
                                style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                                onClick={() => setShowSessionForm(sheet.id)}
                              >
                                + Session
                              </button>
                            )}
                            {sheet.status === 'in_progress' && (
                              <button
                                className="btn btn-success"
                                style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                                onClick={() => setShowValidationForm({
                                  activity_sheet_id: sheet.id,
                                  sheet_type: sheet.sheet_type,
                                  sheet_number: sheet.sheet_number,
                                  sheet_title: sheet.title,
                                  last_name: student.last_name,
                                  first_name: student.first_name,
                                })}
                              >
                                Valider
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </>
            )}

            {/* ===== ONGLET SESSIONS ===== */}
            {!loading && tab === 'sessions' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontWeight: 600 }}>{sessions.length} session(s) enregistrée(s)</span>
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowSessionForm(sheets[0]?.id)}
                    disabled={!sheets.length}
                  >
                    + Nouvelle session
                  </button>
                </div>
                {sessions.length === 0 && (
                  <p style={{ color: '#7f8c8d', textAlign: 'center', padding: 24 }}>Aucune session enregistrée.</p>
                )}
                {sessions.map((s) => {
                  const st = SESSION_STATUS[s.status] || SESSION_STATUS.scheduled;
                  return (
                    <div key={s.id} style={sessionCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>
                            {new Date(s.session_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            {s.session_time && ` · ${s.session_time.slice(0, 5)}`}
                          </div>
                          {s.location && <div style={{ fontSize: '0.82rem', color: '#7f8c8d' }}>📍 {s.location}</div>}
                          {s.objective && <div style={{ fontSize: '0.84rem', marginTop: 4 }}>{s.objective}</div>}
                          <div style={{ fontSize: '0.78rem', color: '#aaa', marginTop: 4 }}>
                            {s.sheet_type} {s.sheet_number}
                            {s.teacher_name && ` · ${s.teacher_name}`}
                          </div>
                        </div>
                        <span className={`badge ${st.cls}`}>{st.label}</span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* ===== ONGLET VALIDATIONS ===== */}
            {!loading && tab === 'validations' && (
              <>
                <div style={{ marginBottom: 14, fontWeight: 600 }}>{validations.length} validation(s)</div>
                {validations.length === 0 && (
                  <p style={{ color: '#7f8c8d', textAlign: 'center', padding: 24 }}>Aucune validation enregistrée.</p>
                )}
                {validations.map((v) => (
                  <div key={v.id} style={sessionCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <span style={{ fontWeight: 600 }}>{v.sheet_type} {v.sheet_number}</span>
                        <span style={{ fontSize: '0.8rem', color: '#7f8c8d', marginLeft: 8 }}>
                          {new Date(v.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      {v.session_grade && (
                        <span style={{ fontWeight: 700, color: v.session_grade >= 8 ? '#27ae60' : v.session_grade >= 6 ? '#f39c12' : '#e74c3c' }}>
                          {parseFloat(v.session_grade).toFixed(1)}/10
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: v.comments ? 8 : 0 }}>
                      <span className={`badge badge-${v.has_subject ? 'success' : 'danger'}`}>Sujet</span>
                      <span className={`badge badge-${v.context_well_formulated ? 'success' : 'danger'}`}>Contexte</span>
                      <span className={`badge badge-${v.objectives_validated ? 'success' : 'danger'}`}>Objectifs</span>
                    </div>
                    {v.comments && <div className="comment-box">{v.comments}</div>}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sous-modals */}
      {showSessionForm && (
        <SessionForm
          student={student}
          activitySheetId={showSessionForm}
          onClose={() => setShowSessionForm(null)}
          onSaved={() => { setShowSessionForm(null); reload(); }}
        />
      )}

      {showValidationForm && (
        <ValidationForm
          validation={showValidationForm}
          onClose={() => setShowValidationForm(null)}
          onSaved={() => { setShowValidationForm(null); reload(); }}
        />
      )}
    </>
  );
}

const overlay = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 900, padding: 16,
};
const modal = {
  background: 'white', borderRadius: 10,
  width: '100%', maxWidth: 640,
  maxHeight: '85vh',
  boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
  display: 'flex', flexDirection: 'column',
  overflow: 'hidden',
};
const header = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '16px 20px',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
};
const closeBtn = { background: 'none', border: 'none', color: 'white', fontSize: '1.3rem', cursor: 'pointer' };
const sheetRow = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '10px 14px', marginBottom: 8,
  background: '#f8f9fa', borderRadius: 8,
  border: '1px solid #e0e0e0', flexWrap: 'wrap', gap: 8,
};
const sessionCard = {
  background: '#f8f9fa', borderRadius: 8,
  padding: '12px 16px', marginBottom: 10,
  border: '1px solid #e0e0e0',
};
