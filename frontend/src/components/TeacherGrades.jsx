import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const ADOC_LABELS = ['ADOC 1', 'ADOC 2', 'ADOC 3', 'ADOC 4', 'ADOC 5'];
const DRCV_LABELS = ['DRCV 1', 'DRCV 2', 'DRCV 3', 'DRCV 4'];

export default function TeacherGrades() {
  const [validations, setValidations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStudent, setFilterStudent] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('all');

  useEffect(() => {
    const params = {};
    if (filterPeriod !== 'all') params.period = filterPeriod;
    setLoading(true);
    api.getValidations(params).then((data) => {
      setValidations(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [filterPeriod]);

  const students = [...new Map(validations.map((v) => [v.student_number, { id: v.student_number, name: `${v.last_name} ${v.first_name}` }])).values()];

  const filtered = validations.filter((v) => {
    if (filterStudent !== 'all' && v.student_number !== filterStudent) return false;
    if (filterType !== 'all' && v.sheet_type !== filterType) return false;
    return true;
  });

  // Données graphique: note moyenne par fiche type
  const adocGrades = ADOC_LABELS.map((_, i) => {
    const vals = validations.filter((v) => v.sheet_type === 'ADOC' && v.sheet_number === i + 1 && v.session_grade);
    return vals.length ? vals.reduce((s, v) => s + parseFloat(v.session_grade), 0) / vals.length : 0;
  });
  const drcvGrades = DRCV_LABELS.map((_, i) => {
    const vals = validations.filter((v) => v.sheet_type === 'DRCV' && v.sheet_number === i + 1 && v.session_grade);
    return vals.length ? vals.reduce((s, v) => s + parseFloat(v.session_grade), 0) / vals.length : 0;
  });

  const avgGrade = validations.filter((v) => v.session_grade).length
    ? (validations.reduce((s, v) => s + (parseFloat(v.session_grade) || 0), 0) / validations.filter((v) => v.session_grade).length).toFixed(1)
    : '—';

  const comments = validations.filter((v) => v.comments).length;

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
          <div className="stat-value">{validations.filter((v) => v.sheet_status === 'validated').length}</div>
          <div className="stat-label">Fiches validées</div>
        </div>
        <div className="stat-box warning">
          <div className="stat-value">{validations.filter((v) => v.sheet_status === 'in_progress').length}</div>
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
              {filtered.map((v) => (
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
                  <td><button className="btn btn-outline">Modifier</button></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#7f8c8d', padding: 24 }}>Aucune évaluation</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Thèmes récurrents */}
      <div className="info-card">
        <h3>💡 Analyse des thèmes récurrents</h3>
        <div className="themes-grid">
          <div className="theme-card success">
            <h4>✅ Points forts</h4>
            <ul>
              <li>• Présentation claire des sujets</li>
              <li>• Bonne maîtrise du contexte</li>
              <li>• Fiches bien structurées</li>
            </ul>
          </div>
          <div className="theme-card warning">
            <h4>⚠️ Axes d'amélioration</h4>
            <ul>
              <li>• Objectifs à reformuler</li>
              <li>• Délais de remise à améliorer</li>
              <li>• Profondeur d'analyse</li>
            </ul>
          </div>
          <div className="theme-card info">
            <h4>💡 Recommandations</h4>
            <ul>
              <li>• Planifier les sessions à l'avance</li>
              <li>• Relances systématiques J+7</li>
              <li>• Grille d'auto-évaluation</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
