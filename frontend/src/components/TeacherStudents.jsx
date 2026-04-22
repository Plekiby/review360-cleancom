import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import StudentDetail from './StudentDetail';

function gradeClass(g) {
  if (g >= 8) return 'grade-high';
  if (g >= 6) return 'grade-medium';
  return 'grade-low';
}

function statusBadge(s) {
  if (s === 'on_track') return <span className="badge badge-success">En cours</span>;
  if (s === 'warning')  return <span className="badge badge-warning">À surveiller</span>;
  if (s === 'critical') return <span className="badge badge-danger">En retard</span>;
  return <span className="badge badge-secondary">Non démarré</span>;
}

function computeStatus(row) {
  if (row.critical_alerts > 0) return 'critical';
  if (row.adoc_validated === 0 && row.drcv_validated === 0) return 'not_started';
  return 'on_track';
}

export default function TeacherStudents({ user }) {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    api.getClasses().then((cls) => {
      setClasses(cls);
      if (cls.length > 0) {
        setSelectedClass(cls[0].id);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    api.getClassStudents(selectedClass).then(setStudents);
  }, [selectedClass]);

  const urgent = students.filter((s) => s.critical_alerts > 0);
  const avgGrade = students.length
    ? (students.reduce((sum, s) => sum + (parseFloat(s.average_grade) || 0), 0) / students.length).toFixed(1)
    : '—';
  const validated = students.filter((s) => s.adoc_validated === 5 && s.drcv_validated === 4).length;
  const inProgress = students.filter((s) => (s.adoc_validated + s.drcv_validated) > 0 && !(s.adoc_validated === 5 && s.drcv_validated === 4)).length;

  const currentClass = classes.find((c) => c.id === selectedClass);

  if (loading) return <div className="info-card">Chargement...</div>;

  return (
    <>
      {/* Stats globales */}
      <div className="stats-grid">
        <div className="stat-box info">
          <div className="stat-value">{students.length}</div>
          <div className="stat-label">Étudiants</div>
        </div>
        <div className="stat-box success">
          <div className="stat-value">{avgGrade}</div>
          <div className="stat-label">Moyenne /10</div>
        </div>
        <div className="stat-box warning">
          <div className="stat-value">{inProgress}</div>
          <div className="stat-label">En cours</div>
        </div>
        <div className="stat-box danger">
          <div className="stat-value">{urgent.length}</div>
          <div className="stat-label">En retard</div>
        </div>
      </div>

      {/* Sélecteur de classe */}
      {classes.length > 1 && (
        <div className="filters-bar" style={{ marginBottom: 16 }}>
          <select value={selectedClass || ''} onChange={(e) => setSelectedClass(e.target.value)}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Bannière alerte */}
      {urgent.length > 0 && (
        <div className="alert-banner danger">
          ⚠️ {urgent.length} étudiant{urgent.length > 1 ? 's' : ''} nécessite{urgent.length > 1 ? 'nt' : ''} votre attention immédiate.
        </div>
      )}

      {/* Tableau étudiants */}
      <div className="info-card">
        <h3>
          {currentClass ? currentClass.name : 'Ma classe'} — {students.length} étudiants
          &nbsp;<span className="badge badge-success">{validated} validés</span>
          &nbsp;<span className="badge badge-warning">{inProgress} en cours</span>
          &nbsp;<span className="badge badge-danger">{urgent.length} en retard</span>
        </h3>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Étudiant</th>
                <th>N° étudiant</th>
                <th>Moyenne</th>
                <th>ADOC</th>
                <th>DRCV</th>
                <th>Dernier suivi</th>
                <th>Statut</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const status = computeStatus(s);
                const grade = parseFloat(s.average_grade);
                return (
                  <tr key={s.id} className={status === 'critical' ? 'urgent' : ''}>
                    <td><strong>{s.last_name} {s.first_name}</strong></td>
                    <td>{s.student_number}</td>
                    <td className={gradeClass(grade)}>
                      {isNaN(grade) ? '—' : `${grade.toFixed(1)}/10`}
                    </td>
                    <td>{s.adoc_validated ?? 0}/5</td>
                    <td>{s.drcv_validated ?? 0}/4</td>
                    <td style={{ fontSize: '0.82rem', color: '#7f8c8d' }}>
                      {s.last_session_date
                        ? new Date(s.last_session_date).toLocaleDateString('fr-FR')
                        : '—'}
                    </td>
                    <td>{statusBadge(status)}</td>
                    <td>
                      <button className="btn btn-primary" onClick={() => setSelectedStudent(s)}>Voir détail</button>
                    </td>
                  </tr>
                );
              })}
              {students.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: '#7f8c8d', padding: 24 }}>Aucun étudiant</td></tr>
              )}
            </tbody>
          </table>
        </div>
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
