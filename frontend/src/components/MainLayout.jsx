import { useState } from 'react';
import TeacherStudents from './TeacherStudents';
import TeacherValidations from './TeacherValidations';
import TeacherGrades from './TeacherGrades';
import AdminMonitoring from './AdminMonitoring';
import AdminClassDetail from './AdminClassDetail';
import AdminReports from './AdminReports';

const TEACHER_TABS = [
  { id: 'students', label: '📋 Suivi Étudiants' },
  { id: 'validations', label: '📝 Mes Validations' },
  { id: 'grades', label: '📊 Notes & Commentaires' },
];

const ADMIN_TABS = [
  { id: 'monitoring', label: '📊 Monitoring' },
  { id: 'classes', label: '🔍 Détail Classes' },
  { id: 'reports', label: '📈 Rapports' },
];

export default function MainLayout({ user, onLogout }) {
  const [activeMode, setActiveMode] = useState(user.role);
  const [activeTab, setActiveTab] = useState(
    user.role === 'admin' ? 'monitoring' : 'students'
  );
  const [pendingClassId, setPendingClassId] = useState(null);

  const canSwitchMode = user.role === 'admin';
  const isAdmin = activeMode === 'admin';
  const tabs = isAdmin ? ADMIN_TABS : TEACHER_TABS;

  const switchMode = () => {
    const newMode = isAdmin ? 'teacher' : 'admin';
    setActiveMode(newMode);
    setActiveTab(newMode === 'admin' ? 'monitoring' : 'students');
  };

  const handleTabChange = (tabId) => setActiveTab(tabId);

  const goToClass = (classId) => {
    setPendingClassId(classId);
    setActiveTab('classes');
  };

  const confirmLogout = () => {
    if (window.confirm('Vous allez être déconnecté. Continuer ?')) {
      onLogout();
    }
  };

  return (
    <>
      <header className="app-header">
        <div>
          <h1>Review360N</h1>
          <div className="subtitle">Suivi BTS MCO — Clean Com</div>
        </div>
        <div className="mode-switcher">
          <span className="mode-badge">
            {isAdmin ? '⚙️ Mode Responsable' : '📚 Mode Enseignant'}
          </span>
          {canSwitchMode && (
            <button className="btn btn-outline" onClick={switchMode} style={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)' }}>
              🔄 Changer de Mode
            </button>
          )}
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem' }}>
            {user.first_name} {user.last_name}
          </span>
          <button className="btn btn-outline" onClick={confirmLogout} style={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)' }}>
            Déconnexion
          </button>
        </div>
      </header>

      <div className="main-container">
        <nav className="tabs-nav">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {!isAdmin && activeTab === 'students'    && <TeacherStudents user={user} />}
        {!isAdmin && activeTab === 'validations' && <TeacherValidations user={user} />}
        {!isAdmin && activeTab === 'grades'      && <TeacherGrades user={user} />}

        {isAdmin  && activeTab === 'monitoring'  && <AdminMonitoring user={user} onClassClick={goToClass} />}
        {isAdmin  && activeTab === 'classes'     && <AdminClassDetail user={user} initialClassId={pendingClassId} onConsumeInitial={() => setPendingClassId(null)} />}
        {isAdmin  && activeTab === 'reports'     && <AdminReports user={user} />}
      </div>
    </>
  );
}
