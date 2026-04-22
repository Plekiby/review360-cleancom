import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function TeacherValidations() {
  const [urgent, setUrgent] = useState([]);
  const [inProgress, setInProgress] = useState([]);
  const [recent, setRecent] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([
      api.getValidations({ status: 'urgent' }),
      api.getValidations({ status: 'in_progress' }),
      api.getValidations({}),
      api.getTeacherDashboard(),
    ]).then(([u, ip, all, dash]) => {
      setUrgent(u);
      setInProgress(ip);
      // Validations des 7 derniers jours
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
      setRecent(all.filter((v) => new Date(v.created_at) > sevenDaysAgo));
      setStats(dash.stats || {});
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filterRows = (rows) => {
    let filtered = rows;
    if (filterType !== 'all') filtered = filtered.filter((r) => r.sheet_type === filterType);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((r) =>
        r.last_name?.toLowerCase().includes(q) || r.first_name?.toLowerCase().includes(q)
      );
    }
    return filtered;
  };

  if (loading) return <div className="info-card">Chargement...</div>;

  return (
    <>
      {/* Stat boxes */}
      <div className="stats-grid">
        <div className="stat-box danger">
          <div className="stat-value">{stats.urgent_count ?? urgent.length}</div>
          <div className="stat-label">Validations urgentes</div>
        </div>
        <div className="stat-box warning">
          <div className="stat-value">{stats.in_progress_count ?? inProgress.length}</div>
          <div className="stat-label">En cours</div>
        </div>
        <div className="stat-box success">
          <div className="stat-value">{stats.validated_this_week ?? '—'}</div>
          <div className="stat-label">Validées cette semaine</div>
        </div>
        <div className="stat-box info">
          <div className="stat-value">{stats.avg_validation_days ?? '—'}</div>
          <div className="stat-label">Jours moy. validation</div>
        </div>
      </div>

      {/* Filtres */}
      <div className="filters-bar">
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="all">Tous types</option>
          <option value="ADOC">ADOC</option>
          <option value="DRCV">DRCV</option>
        </select>
        <input
          type="text"
          placeholder="Rechercher un étudiant..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tableau urgentes */}
      <div className="info-card">
        <h3>⚠️ Validations urgentes (&gt; 7 jours)</h3>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Étudiant</th>
                <th>Fiche</th>
                <th>Type</th>
                <th>Soumise le</th>
                <th>Délai</th>
                <th>Priorité</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filterRows(urgent).map((v) => (
                <tr key={v.id} className="urgent">
                  <td><strong>{v.last_name} {v.first_name}</strong></td>
                  <td>{v.sheet_title || `${v.sheet_type} ${v.sheet_number}`}</td>
                  <td><span className={`badge badge-${v.sheet_type === 'ADOC' ? 'info' : 'warning'}`}>{v.sheet_type}</span></td>
                  <td style={{ fontSize: '0.82rem' }}>{new Date(v.created_at).toLocaleDateString('fr-FR')}</td>
                  <td><span className="badge badge-danger">{Math.round(v.days_since_validation)} j</span></td>
                  <td><span className="badge badge-danger">URGENT</span></td>
                  <td><button className="btn btn-danger">Valider maintenant</button></td>
                </tr>
              ))}
              {filterRows(urgent).length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#27ae60', padding: 16 }}>✅ Aucune validation urgente</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tableau en cours */}
      <div className="info-card">
        <h3>🔄 En cours</h3>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Étudiant</th>
                <th>Fiche</th>
                <th>Type</th>
                <th>Soumise le</th>
                <th>Délai</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filterRows(inProgress).map((v) => (
                <tr key={v.id}>
                  <td><strong>{v.last_name} {v.first_name}</strong></td>
                  <td>{v.sheet_title || `${v.sheet_type} ${v.sheet_number}`}</td>
                  <td><span className={`badge badge-${v.sheet_type === 'ADOC' ? 'info' : 'warning'}`}>{v.sheet_type}</span></td>
                  <td style={{ fontSize: '0.82rem' }}>{new Date(v.created_at).toLocaleDateString('fr-FR')}</td>
                  <td>{Math.round(v.days_since_validation)} j</td>
                  <td><button className="btn btn-primary">Valider</button></td>
                </tr>
              ))}
              {filterRows(inProgress).length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#7f8c8d', padding: 16 }}>Aucune fiche en cours</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Timeline 7 derniers jours */}
      <div className="info-card">
        <h3>📅 Validations récentes (7 derniers jours)</h3>
        {recent.length === 0 ? (
          <p style={{ color: '#7f8c8d', fontSize: '0.88rem' }}>Aucune validation cette semaine.</p>
        ) : (
          <div className="timeline">
            {recent.map((v) => (
              <div className="timeline-item" key={v.id}>
                <div className="timeline-date">
                  {new Date(v.created_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  &nbsp;·&nbsp;
                  {new Date(v.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="timeline-content">
                  <strong>{v.last_name} {v.first_name}</strong> — {v.sheet_type} {v.sheet_number}
                  {v.session_grade && (
                    <span style={{ marginLeft: 8 }} className={`badge badge-${v.session_grade >= 8 ? 'success' : v.session_grade >= 6 ? 'warning' : 'danger'}`}>
                      {v.session_grade}/10
                    </span>
                  )}
                  {v.comments && <div className="comment-box" style={{ marginTop: 8 }}>{v.comments}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
