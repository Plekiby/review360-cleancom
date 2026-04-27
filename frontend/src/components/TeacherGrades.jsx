import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import StudentDetail from './StudentDetail';

const ADOC_LABELS = ['ADOC 1', 'ADOC 2', 'ADOC 3', 'ADOC 4', 'ADOC 5'];
const DRCV_LABELS = ['DRCV 1', 'DRCV 2', 'DRCV 3', 'DRCV 4'];

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function TeacherGrades() {
  const [validations, setValidations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStudent, setFilterStudent] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const params = {};
    if (filterPeriod !== 'all') params.period = filterPeriod;
    setLoading(true);
    api.getValidations(params).then((data) => {
      setValidations(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [filterPeriod]);

  useEffect(() => { setPage(1); }, [filterStudent, filterType, filterPeriod]);

  const students = [...new Map(validations.map((v) => [v.student_number, { id: v.student_number, name: `${v.last_name} ${v.first_name}` }])).values()];

  const filtered = validations.filter((v) => {
    if (filterStudent !== 'all' && v.student_number !== filterStudent) return false;
    if (filterType !== 'all' && v.sheet_type !== filterType) return false;
    return true;
  });

  // Données graphique : moyenne par fiche — calculées sur le jeu filtré
  // pour que les barres reflètent les filtres étudiant / type / période actifs.
  const adocGrades = ADOC_LABELS.map((_, i) => {
    const vals = filtered.filter((v) => v.sheet_type === 'ADOC' && v.sheet_number === i + 1 && v.session_grade);
    return vals.length ? vals.reduce((s, v) => s + parseFloat(v.session_grade), 0) / vals.length : 0;
  });
  const drcvGrades = DRCV_LABELS.map((_, i) => {
    const vals = filtered.filter((v) => v.sheet_type === 'DRCV' && v.sheet_number === i + 1 && v.session_grade);
    return vals.length ? vals.reduce((s, v) => s + parseFloat(v.session_grade), 0) / vals.length : 0;
  });

  const gradedFiltered = filtered.filter((v) => v.session_grade);
  const avgGrade = gradedFiltered.length
    ? (gradedFiltered.reduce((s, v) => s + (parseFloat(v.session_grade) || 0), 0) / gradedFiltered.length).toFixed(1)
    : '—';

  const comments = filtered.filter((v) => v.comments).length;

  // Compter les fiches distinctes (pas les lignes validation) pour éviter le double-comptage
  const validatedSheetIds = new Set(validations.filter((v) => v.sheet_status === 'validated').map((v) => v.activity_sheet_id));
  const inProgressSheetIds = new Set(validations.filter((v) => v.sheet_status === 'in_progress').map((v) => v.activity_sheet_id));

  // ── Thèmes calculés à partir des vraies données ───────────────────────────
  // Moyenne par fiche (type + numéro), uniquement celles avec au moins 1 note.
  const sheetStats = (() => {
    const map = new Map();
    for (const v of filtered) {
      if (!v.session_grade) continue;
      const key = `${v.sheet_type} ${v.sheet_number}`;
      const entry = map.get(key) || { key, type: v.sheet_type, num: v.sheet_number, sum: 0, count: 0 };
      entry.sum += parseFloat(v.session_grade);
      entry.count += 1;
      map.set(key, entry);
    }
    return [...map.values()].map((e) => ({ ...e, avg: e.sum / e.count }));
  })();
  const topSheets = [...sheetStats].sort((a, b) => b.avg - a.avg).slice(0, 3);
  const bottomSheets = [...sheetStats].sort((a, b) => a.avg - b.avg).slice(0, 3);

  // Taux de validation par checkpoint (sur l'ensemble filtré).
  const checkpointStats = (() => {
    const total = filtered.length;
    if (!total) return null;
    const subj = filtered.filter((v) => v.has_subject).length;
    const ctx  = filtered.filter((v) => v.context_well_formulated).length;
    const obj  = filtered.filter((v) => v.objectives_validated).length;
    const items = [
      { label: 'Sujet défini',    rate: subj / total, count: subj },
      { label: 'Contexte formulé', rate: ctx  / total, count: ctx  },
      { label: 'Objectifs validés', rate: obj  / total, count: obj  },
    ];
    return { items, total, weakest: [...items].sort((a, b) => a.rate - b.rate)[0] };
  })();

  if (loading) return <div className="info-card">Chargement...</div>;

  return (
    <>
      {/* Stat boxes */}
      <div className="stats-grid">
        <div className="stat-box purple">
          <div className="stat-value">{avgGrade}</div>
          <div className="stat-label">Moyenne globale</div>
        </div>
        <div className="stat-box success">
          <div className="stat-value">{validatedSheetIds.size}</div>
          <div className="stat-label">Fiches validées</div>
        </div>
        <div className="stat-box warning">
          <div className="stat-value">{inProgressSheetIds.size}</div>
          <div className="stat-label">En cours</div>
        </div>
        <div className="stat-box info">
          <div className="stat-value">{comments}</div>
          <div className="stat-label">Commentaires</div>
        </div>
      </div>

      {/* Graphique CSS barres */}
      <div className="info-card">
        <h3>📊 Progression par fiche</h3>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#3498db', fontWeight: 600, marginBottom: 8 }}>ADOC</div>
            <div className="bar-chart">
              {adocGrades.map((grade, i) => (
                <div className="bar-item adoc" key={i} title={`${ADOC_LABELS[i]}: ${grade.toFixed(1)}/10`}>
                  <div className="bar-value" style={{ fontSize: '0.7rem' }}>{grade > 0 ? grade.toFixed(1) : ''}</div>
                  <div className="bar-fill" style={{ height: `${(grade / 10) * 160}px` }} />
                  <div className="bar-label">{ADOC_LABELS[i]}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#f39c12', fontWeight: 600, marginBottom: 8 }}>DRCV</div>
            <div className="bar-chart">
              {drcvGrades.map((grade, i) => (
                <div className="bar-item drcv" key={i} title={`${DRCV_LABELS[i]}: ${grade.toFixed(1)}/10`}>
                  <div className="bar-value" style={{ fontSize: '0.7rem' }}>{grade > 0 ? grade.toFixed(1) : ''}</div>
                  <div className="bar-fill" style={{ height: `${(grade / 10) * 160}px` }} />
                  <div className="bar-label">{DRCV_LABELS[i]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="filters-bar">
        <select value={filterStudent} onChange={(e) => setFilterStudent(e.target.value)}>
          <option value="all">Tous les étudiants</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="all">Toutes les fiches</option>
          <option value="ADOC">ADOC</option>
          <option value="DRCV">DRCV</option>
        </select>
        <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)}>
          <option value="all">Toutes les périodes</option>
          <option value="week">Cette semaine</option>
          <option value="month">Ce mois</option>
          <option value="quarter">Ce trimestre</option>
        </select>
      </div>

      {/* Tableau historique */}
      <div className="info-card">
        <h3>📋 Historique des évaluations</h3>
        <div className="table-wrapper">
          {(() => {
            const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
            const safePage = Math.min(page, totalPages);
            const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
            return (
              <>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Étudiant</th>
                      <th>Fiche</th>
                      <th>Note</th>
                      <th>Commentaire</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((v) => (
                      <tr key={v.id}>
                        <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{new Date(v.created_at).toLocaleDateString('fr-FR')}</td>
                        <td><strong>{v.last_name} {v.first_name}</strong></td>
                        <td><span className={`badge badge-${v.sheet_type === 'ADOC' ? 'info' : 'warning'}`}>{v.sheet_type} {v.sheet_number}</span></td>
                        <td>
                          {v.session_grade
                            ? <span className={`${v.session_grade >= 8 ? 'grade-high' : v.session_grade >= 6 ? 'grade-medium' : 'grade-low'}`}>{parseFloat(v.session_grade).toFixed(1)}/10</span>
                            : <span style={{ color: '#aaa' }}>—</span>}
                        </td>
                        <td>
                          {v.comments
                            ? <div className="comment-box">{v.comments}</div>
                            : <span style={{ color: '#aaa', fontSize: '0.8rem' }}>—</span>}
                        </td>
                        <td>
                          <button
                            className="btn btn-primary"
                            style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                            onClick={() => setSelectedStudent({
                              id: v.student_id,
                              last_name: v.last_name,
                              first_name: v.first_name,
                              student_number: v.student_number,
                            })}
                          >
                            Voir détail
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', color: '#7f8c8d', padding: 24 }}>Aucune évaluation</td></tr>
                    )}
                  </tbody>
                </table>
                {filtered.length > 10 && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end', marginTop: 12 }}>
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} className="btn btn-outline" style={{ padding: '4px 10px' }}>‹</button>
                    <span style={{ fontSize: '0.85rem' }}>{safePage} / {totalPages}</span>
                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="btn btn-outline" style={{ padding: '4px 10px' }}>›</button>
                    <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} style={{ fontSize: '0.82rem', padding: '4px 8px' }}>
                      {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n} / page</option>)}
                    </select>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Thèmes récurrents — calculés depuis les validations filtrées */}
      <div className="info-card">
        <h3>💡 Analyse des thèmes</h3>
        {sheetStats.length === 0 && !checkpointStats ? (
          <p style={{ color: '#7f8c8d', fontSize: '0.88rem', margin: 0 }}>
            Pas encore assez de validations notées pour générer une analyse. Ajoutez des validations avec note pour voir apparaître les tendances.
          </p>
        ) : (
          <div className="themes-grid">
            <div className="theme-card success">
              <h4>✅ Fiches les mieux notées</h4>
              {topSheets.length > 0 ? (
                <ul>
                  {topSheets.map((s) => (
                    <li key={s.key}>
                      • <strong>{s.key}</strong> — {s.avg.toFixed(1)}/10 <span style={{ color: '#7f8c8d', fontSize: '0.78rem' }}>({s.count} note{s.count > 1 ? 's' : ''})</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: '#7f8c8d', fontSize: '0.82rem' }}>Aucune note disponible.</p>
              )}
            </div>

            <div className="theme-card warning">
              <h4>⚠️ Fiches à retravailler</h4>
              {bottomSheets.length > 0 ? (
                <ul>
                  {bottomSheets.map((s) => (
                    <li key={s.key}>
                      • <strong>{s.key}</strong> — {s.avg.toFixed(1)}/10 <span style={{ color: '#7f8c8d', fontSize: '0.78rem' }}>({s.count} note{s.count > 1 ? 's' : ''})</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: '#7f8c8d', fontSize: '0.82rem' }}>Aucune note disponible.</p>
              )}
            </div>

            <div className="theme-card info">
              <h4>📋 Critères de validation</h4>
              {checkpointStats ? (
                <>
                  <ul>
                    {checkpointStats.items.map((it) => (
                      <li key={it.label}>
                        • {it.label} : <strong>{Math.round(it.rate * 100)}%</strong>
                        <span style={{ color: '#7f8c8d', fontSize: '0.78rem' }}> ({it.count}/{checkpointStats.total})</span>
                      </li>
                    ))}
                  </ul>
                  {checkpointStats.weakest && checkpointStats.weakest.rate < 0.7 && (
                    <p style={{ fontSize: '0.8rem', color: '#c0392b', marginTop: 6 }}>
                      💡 Point faible : « {checkpointStats.weakest.label} » est validé seulement {Math.round(checkpointStats.weakest.rate * 100)}% du temps.
                    </p>
                  )}
                </>
              ) : (
                <p style={{ color: '#7f8c8d', fontSize: '0.82rem' }}>Pas encore de validation enregistrée.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {selectedStudent && (
        <StudentDetail
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </>
  );
}
