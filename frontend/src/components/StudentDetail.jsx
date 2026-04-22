import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import SessionForm from './SessionForm';
import ValidationForm from './ValidationForm';
import SheetDetailForm from './SheetDetailForm';

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

const ALERT_COLORS = {
  VERT:   { bg: '#f0fdf4', border: '#27ae60', badge: 'badge-success' },
  ORANGE: { bg: '#fffbf0', border: '#f39c12', badge: 'badge-warning' },
  ROUGE:  { bg: '#fff5f5', border: '#e74c3c', badge: 'badge-danger' },
};

function SessionCard({ session, sheets, onStatusChange, onValidate, hideSheetLabel = false }) {
  const [savingNotes, setSavingNotes] = useState(false);
  const [notes, setNotes] = useState(session.notes || '');
  const [editingNotes, setEditingNotes] = useState(false);
  const st = SESSION_STATUS[session.status] || SESSION_STATUS.scheduled;

  // Sync local notes state when session data changes after reload (prevents cross-session bleed)
  useEffect(() => {
    if (!editingNotes) {
      setNotes(session.notes || '');
    }
  }, [session.id, session.notes]);

  const sheet = sheets.find((s) => s.id === session.activity_sheet_id);
  const canValidate = session.status === 'completed' && sheet?.status === 'in_progress';

  const handleStatus = async (newStatus) => {
    try {
      await api.updateSession(session.id, { status: newStatus });
      onStatusChange();
    } catch (err) {
      alert(`Erreur : ${err.message}`);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await api.updateSession(session.id, { notes });
      setEditingNotes(false);
      onStatusChange();
    } catch (err) {
      alert(`Erreur : ${err.message}`);
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div style={sessionCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600 }}>
            {new Date(session.session_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            {session.session_time && ` · ${session.session_time.slice(0, 5)}`}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#7f8c8d', marginTop: 2 }}>
            {!hideSheetLabel && (
              <span style={{ fontWeight: 600, color: session.sheet_type === 'ADOC' ? '#3498db' : '#f39c12', marginRight: 4 }}>
                {session.sheet_type} {session.sheet_number} ·{' '}
              </span>
            )}
            {session.location && <span>📍 {session.location} · </span>}
            {session.teacher_name && <span>{session.teacher_name}</span>}
          </div>
          {session.objective && (
            <div style={{ fontSize: '0.83rem', color: '#555', marginTop: 4, fontStyle: 'italic' }}>
              Objectif : {session.objective}
            </div>
          )}
        </div>
        <span className={`badge ${st.cls}`} style={{ marginLeft: 8, whiteSpace: 'nowrap' }}>{st.label}</span>
      </div>

      {session.status === 'completed' && (
        <div style={{ marginTop: 8 }}>
          {editingNotes ? (
            <div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observations, compte-rendu de la session..."
                rows={3}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #667eea', resize: 'vertical', fontFamily: 'inherit', fontSize: '0.84rem', boxSizing: 'border-box' }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button className="btn btn-primary" style={{ fontSize: '0.78rem', padding: '4px 12px' }} onClick={handleSaveNotes} disabled={savingNotes}>
                  {savingNotes ? 'Sauvegarde...' : '💾 Sauvegarder'}
                </button>
                <button className="btn btn-outline" style={{ fontSize: '0.78rem', padding: '4px 10px' }} onClick={() => { setEditingNotes(false); setNotes(session.notes || ''); }}>
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div>
              {session.notes && <div className="comment-box" style={{ marginBottom: 6 }}>{session.notes}</div>}
              <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '3px 10px' }} onClick={() => setEditingNotes(true)}>
                📝 {session.notes ? 'Modifier note' : 'Ajouter note post-session'}
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
        {session.status === 'scheduled' && (
          <>
            <button className="btn btn-success" style={{ fontSize: '0.75rem', padding: '4px 10px' }} onClick={() => handleStatus('completed')}>✅ Réalisée</button>
            <button className="btn btn-warning" style={{ fontSize: '0.75rem', padding: '4px 10px' }} onClick={() => handleStatus('rescheduled')}>📅 Reporter</button>
            <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '4px 10px', color: '#e74c3c', borderColor: '#e74c3c' }} onClick={() => handleStatus('cancelled')}>❌ Annuler</button>
          </>
        )}
        {session.status === 'rescheduled' && (
          <>
            <button className="btn btn-success" style={{ fontSize: '0.75rem', padding: '4px 10px' }} onClick={() => handleStatus('completed')}>✅ Réalisée</button>
            <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '4px 10px', color: '#e74c3c', borderColor: '#e74c3c' }} onClick={() => handleStatus('cancelled')}>❌ Annuler</button>
          </>
        )}
        {canValidate && (
          <button className="btn btn-success" style={{ fontSize: '0.75rem', padding: '4px 12px', fontWeight: 600 }} onClick={() => onValidate(sheet)}>
            ✅ Valider la fiche {session.sheet_type} {session.sheet_number}
          </button>
        )}
      </div>
    </div>
  );
}

export default function StudentDetail({ student, onClose }) {
  const [tab, setTab] = useState('sheets');
  const [sheets, setSheets] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [validations, setValidations] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSessionForm, setShowSessionForm] = useState(null);
  const [showValidationForm, setShowValidationForm] = useState(null);
  const [showSheetForm, setShowSheetForm] = useState(null);
  const [resolvingAlert, setResolvingAlert] = useState(null);
  const [expandedSheetId, setExpandedSheetId] = useState(null);
  const [sessionFilter, setSessionFilter] = useState('all');

  const reload = () => {
    Promise.all([
      api.getActivitySheets(student.id),
      api.getSessions({ studentId: student.id }),
      api.getValidations({ studentId: student.id }),
      api.getAlerts({ studentId: student.id }),
    ]).then(([s, sess, v, al]) => {
      setSheets(s);
      setSessions(sess);
      setValidations(v);
      setAlerts(al);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { reload(); }, [student.id]);

  const adocSheets = sheets.filter((s) => s.sheet_type === 'ADOC').sort((a, b) => a.sheet_number - b.sheet_number);
  const drcvSheets = sheets.filter((s) => s.sheet_type === 'DRCV').sort((a, b) => a.sheet_number - b.sheet_number);
  const activeSheets = sheets.filter((s) => s.status !== 'validated');

  const sessionsForSheet = (sheetId) => sessions.filter((s) => s.activity_sheet_id === sheetId);

  const avgGrade = validations.filter((v) => v.session_grade).length
    ? (validations.reduce((s, v) => s + (parseFloat(v.session_grade) || 0), 0) / validations.filter((v) => v.session_grade).length).toFixed(1)
    : '—';

  const openValidation = (sheet) => setShowValidationForm({
    activity_sheet_id: sheet.id,
    sheet_type: sheet.sheet_type,
    sheet_number: sheet.sheet_number,
    sheet_title: sheet.title,
    last_name: student.last_name,
    first_name: student.first_name,
  });

  const handleResolveAlert = async (alertId) => {
    setResolvingAlert(alertId);
    try {
      await api.resolveAlert(alertId);
      reload();
    } catch (err) {
      alert(`Erreur : ${err.message}`);
    } finally {
      setResolvingAlert(null);
    }
  };

  // Sessions tab: sheets that have at least one session and match the current filter
  const sheetsWithSessions = sheets
    .filter((sh) => (sessionFilter === 'all' || sh.sheet_type === sessionFilter) && sessionsForSheet(sh.id).length > 0)
    .sort((a, b) => {
      if (a.sheet_type !== b.sheet_type) return a.sheet_type === 'ADOC' ? -1 : 1;
      return a.sheet_number - b.sheet_number;
    });

  const noSessionsForFilter = sheets
    .filter((sh) => sessionFilter === 'all' || sh.sheet_type === sessionFilter)
    .every((sh) => sessionsForSheet(sh.id).length === 0);

  const TABS = [
    { id: 'sheets',      label: `📋 Fiches (${sheets.length})` },
    { id: 'sessions',    label: `📅 Sessions (${sessions.length})` },
    { id: 'validations', label: `✅ Validations (${validations.length})` },
    { id: 'alerts',      label: `🔔 Alertes${alerts.length > 0 ? ` (${alerts.length})` : ''}` },
  ];

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
                {alerts.length > 0 && <span style={{ marginLeft: 8, background: 'rgba(231,76,60,0.8)', borderRadius: 10, padding: '1px 7px' }}>⚠️ {alerts.length} alerte{alerts.length > 1 ? 's' : ''}</span>}
              </div>
            </div>
            <button onClick={onClose} style={closeBtn}>✕</button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '2px solid #e0e0e0', background: '#f8f9fa', overflowX: 'auto' }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: '12px 16px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap',
                  background: tab === t.id ? 'white' : 'transparent',
                  borderBottom: tab === t.id ? '2px solid #667eea' : '2px solid transparent',
                  fontWeight: tab === t.id ? 600 : 400,
                  color: t.id === 'alerts' && alerts.length > 0 ? '#e74c3c' : (tab === t.id ? '#667eea' : '#7f8c8d'),
                  marginBottom: -2,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Contenu */}
          <div style={{ padding: 20, overflowY: 'auto', maxHeight: 'calc(88vh - 165px)' }}>
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
                      const isExpanded = expandedSheetId === sheet.id;
                      const sheetSessions = sessionsForSheet(sheet.id);
                      return (
                        <div key={sheet.id} style={{ marginBottom: 8 }}>
                          {/* Sheet row */}
                          <div style={{
                            ...sheetRow,
                            borderRadius: isExpanded ? '8px 8px 0 0' : 8,
                            borderBottom: isExpanded ? 'none' : '1px solid #e0e0e0',
                            background: isExpanded ? '#eef1ff' : '#f8f9fa',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 600, minWidth: 70, color }}>{type} {sheet.sheet_number}</span>
                              <span className={`badge ${st.cls}`}>{st.label}</span>
                              {sheet.title
                                ? <span style={{ fontSize: '0.82rem', color: '#555' }}>{sheet.title}</span>
                                : <span style={{ fontSize: '0.78rem', color: '#bbb', fontStyle: 'italic' }}>Titre non renseigné</span>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              {!isNaN(grade) && (
                                <span style={{ fontWeight: 600, color: grade >= 8 ? '#27ae60' : grade >= 6 ? '#f39c12' : '#e74c3c' }}>
                                  {grade.toFixed(1)}/10
                                </span>
                              )}
                              <span style={{ fontSize: '0.78rem', color: '#aaa' }}>{sheetSessions.length} session(s)</span>
                              <button
                                className="btn btn-outline"
                                style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                                onClick={() => setShowSheetForm(sheet)}
                                title="Voir / éditer le contenu"
                              >
                                ✏️
                              </button>
                              {sheet.status !== 'validated' && (
                                <button
                                  className={`btn ${sheet.status === 'not_started' ? 'btn-primary' : 'btn-outline'}`}
                                  style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                                  onClick={() => setShowSessionForm(sheet.id)}
                                >
                                  {sheet.status === 'not_started' ? '▶ Démarrer' : '+ Session'}
                                </button>
                              )}
                              {sheet.status === 'in_progress' && (
                                <button
                                  className="btn btn-success"
                                  style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                                  onClick={() => openValidation(sheet)}
                                >
                                  Valider
                                </button>
                              )}
                              {/* Expand/collapse toggle */}
                              <button
                                onClick={() => setExpandedSheetId(isExpanded ? null : sheet.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem', color: '#667eea', padding: '2px 6px', fontWeight: 700 }}
                                title={isExpanded ? 'Replier les sessions' : 'Voir les sessions'}
                              >
                                {isExpanded ? '▲' : '▼'}
                              </button>
                            </div>
                          </div>

                          {/* Inline sessions for this sheet */}
                          {isExpanded && (
                            <div style={{ background: '#f0f4ff', borderRadius: '0 0 8px 8px', padding: '14px 16px', border: '1px solid #d0d8f0', borderTop: 'none' }}>
                              {sheetSessions.length === 0 ? (
                                <p style={{ color: '#7f8c8d', fontSize: '0.84rem', margin: 0 }}>
                                  Aucune session pour cette fiche.
                                  {sheet.status === 'not_started' && ' Cliquez "▶ Démarrer" pour commencer.'}
                                </p>
                              ) : (
                                sheetSessions.map((sess) => (
                                  <SessionCard
                                    key={sess.id}
                                    session={sess}
                                    sheets={sheets}
                                    onStatusChange={reload}
                                    onValidate={openValidation}
                                    hideSheetLabel
                                  />
                                ))
                              )}
                            </div>
                          )}
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
                {/* Filter + action bar */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                  {['all', 'ADOC', 'DRCV'].map((f) => (
                    <button
                      key={f}
                      className={`btn ${sessionFilter === f ? 'btn-primary' : 'btn-outline'}`}
                      style={{ fontSize: '0.8rem', padding: '5px 14px' }}
                      onClick={() => setSessionFilter(f)}
                    >
                      {f === 'all' ? 'Toutes les fiches' : f}
                    </button>
                  ))}
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '0.8rem', color: '#7f8c8d' }}>{sessions.length} session(s)</span>
                    <button className="btn btn-primary" style={{ fontSize: '0.85rem' }} onClick={() => setShowSessionForm('__select__')} disabled={!activeSheets.length}>
                      + Nouvelle session
                    </button>
                  </div>
                </div>

                {/* Sessions grouped by sheet */}
                {noSessionsForFilter ? (
                  <p style={{ color: '#7f8c8d', textAlign: 'center', padding: 24 }}>
                    Aucune session. Utilisez "▶ Démarrer" dans l'onglet Fiches.
                  </p>
                ) : (
                  sheetsWithSessions.map((sheet) => {
                    const sheetSessions = sessionsForSheet(sheet.id);
                    const color = sheet.sheet_type === 'ADOC' ? '#3498db' : '#f39c12';
                    const st = STATUS_LABEL[sheet.status] || STATUS_LABEL.not_started;
                    return (
                      <div key={sheet.id} style={{ marginBottom: 24 }}>
                        {/* Sheet group header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '8px 14px', background: `${color}18`, borderRadius: 8, borderLeft: `4px solid ${color}` }}>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color }}>{sheet.sheet_type} {sheet.sheet_number}</span>
                          <span className={`badge ${st.cls}`}>{st.label}</span>
                          {sheet.title && <span style={{ fontSize: '0.82rem', color: '#555' }}>{sheet.title}</span>}
                          <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#aaa' }}>{sheetSessions.length} session(s)</span>
                          {sheet.status !== 'validated' && (
                            <button
                              className="btn btn-outline"
                              style={{ fontSize: '0.75rem', padding: '3px 10px' }}
                              onClick={() => setShowSessionForm(sheet.id)}
                            >
                              + Session
                            </button>
                          )}
                        </div>
                        {sheetSessions.map((sess) => (
                          <SessionCard
                            key={sess.id}
                            session={sess}
                            sheets={sheets}
                            onStatusChange={reload}
                            onValidate={openValidation}
                            hideSheetLabel
                          />
                        ))}
                      </div>
                    );
                  })
                )}
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
                        {v.sheet_title && <span style={{ fontSize: '0.82rem', color: '#7f8c8d', marginLeft: 6 }}>— {v.sheet_title}</span>}
                        <span style={{ fontSize: '0.8rem', color: '#aaa', marginLeft: 8 }}>
                          {new Date(v.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      {v.session_grade && (
                        <span style={{ fontWeight: 700, color: v.session_grade >= 8 ? '#27ae60' : v.session_grade >= 6 ? '#f39c12' : '#e74c3c' }}>
                          {parseFloat(v.session_grade).toFixed(1)}/10
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: v.comments ? 8 : 0 }}>
                      <span className={`badge badge-${v.has_subject ? 'success' : 'danger'}`}>
                        {v.has_subject ? '✓' : '✗'} Sujet
                      </span>
                      <span className={`badge badge-${v.context_well_formulated ? 'success' : 'danger'}`}>
                        {v.context_well_formulated ? '✓' : '✗'} Contexte
                      </span>
                      <span className={`badge badge-${v.objectives_validated ? 'success' : 'danger'}`}>
                        {v.objectives_validated ? '✓' : '✗'} Objectifs
                      </span>
                      <span className={`badge badge-${v.has_subject && v.context_well_formulated && v.objectives_validated ? 'success' : 'warning'}`}>
                        {v.has_subject && v.context_well_formulated && v.objectives_validated ? '✅ Fiche validée' : '⚠️ Incomplet'}
                      </span>
                    </div>
                    {v.comments && <div className="comment-box">{v.comments}</div>}
                  </div>
                ))}
              </>
            )}

            {/* ===== ONGLET ALERTES ===== */}
            {!loading && tab === 'alerts' && (
              <>
                {alerts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 32 }}>
                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>✅</div>
                    <p style={{ color: '#27ae60', fontWeight: 600 }}>Aucune alerte active</p>
                    <p style={{ color: '#7f8c8d', fontSize: '0.85rem' }}>Cet étudiant est à jour dans son parcours.</p>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: 14, fontWeight: 600 }}>{alerts.length} alerte{alerts.length > 1 ? 's' : ''} active{alerts.length > 1 ? 's' : ''}</div>
                    {alerts.map((al) => {
                      const colors = ALERT_COLORS[al.alert_type] || ALERT_COLORS.ORANGE;
                      return (
                        <div key={al.id} style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderLeft: `4px solid ${colors.border}`, borderRadius: 8, padding: '12px 16px', marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <span className={`badge ${colors.badge}`}>{al.alert_type}</span>
                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{al.reason}</span>
                              </div>
                              <div style={{ fontSize: '0.78rem', color: '#7f8c8d' }}>
                                Créée le {new Date(al.created_at).toLocaleDateString('fr-FR')}
                              </div>
                            </div>
                            <button
                              className="btn btn-success"
                              style={{ fontSize: '0.75rem', padding: '4px 12px', marginLeft: 12 }}
                              disabled={resolvingAlert === al.id}
                              onClick={() => handleResolveAlert(al.id)}
                            >
                              {resolvingAlert === al.id ? '...' : '✅ Résoudre'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {showSessionForm && (
        <SessionForm
          student={student}
          activitySheetId={showSessionForm === '__select__' ? null : showSessionForm}
          sheets={showSessionForm === '__select__' ? activeSheets : null}
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

      {showSheetForm && (
        <SheetDetailForm
          sheet={showSheetForm}
          onClose={() => setShowSheetForm(null)}
          onSaved={() => { setShowSheetForm(null); reload(); }}
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
  width: '100%', maxWidth: 720,
  maxHeight: '90vh',
  boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
  display: 'flex', flexDirection: 'column',
  overflow: 'hidden',
};
const header = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '16px 20px',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white', flexShrink: 0,
};
const closeBtn = { background: 'none', border: 'none', color: 'white', fontSize: '1.3rem', cursor: 'pointer' };
const sheetRow = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '10px 14px',
  border: '1px solid #e0e0e0', flexWrap: 'wrap', gap: 8,
};
const sessionCard = {
  background: '#f8f9fa', borderRadius: 8,
  padding: '12px 16px', marginBottom: 10,
  border: '1px solid #e0e0e0',
};
