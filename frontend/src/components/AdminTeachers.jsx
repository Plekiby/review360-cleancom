import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function AdminTeachers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);

  const reload = () => {
    setLoading(true);
    api.getUsers().then((data) => {
      setUsers(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);

  const toggleActive = async (user) => {
    try {
      await api.updateUser(user.id, { is_active: !user.is_active });
      reload();
    } catch (err) {
      alert(err.message);
    }
  };

  const filtered = search
    ? users.filter((u) =>
        `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  const activeCount = users.filter((u) => u.is_active).length;
  const teacherCount = users.filter((u) => u.role === 'teacher').length;

  if (loading) return <div className="info-card">Chargement...</div>;

  return (
    <>
      <div className="stats-grid">
        <div className="stat-box info">
          <div className="stat-value">{users.length}</div>
          <div className="stat-label">Comptes total</div>
        </div>
        <div className="stat-box success">
          <div className="stat-value">{teacherCount}</div>
          <div className="stat-label">Formateurs</div>
        </div>
        <div className="stat-box warning">
          <div className="stat-value">{activeCount}</div>
          <div className="stat-label">Comptes actifs</div>
        </div>
        <div className="stat-box danger">
          <div className="stat-value">{users.length - activeCount}</div>
          <div className="stat-label">Comptes inactifs</div>
        </div>
      </div>

      <div className="info-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>👥 Gestion des comptes</h3>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Nouveau compte</button>
        </div>

        <div className="filters-bar" style={{ marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ minWidth: 260 }}
          />
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Créé le</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.55 }}>
                  <td><strong>{u.last_name} {u.first_name}</strong></td>
                  <td style={{ fontSize: '0.85rem' }}>{u.email}</td>
                  <td>
                    <span className={`badge badge-${u.role === 'admin' ? 'danger' : 'info'}`}>
                      {u.role === 'admin' ? '⚙️ Admin' : '📚 Formateur'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${u.is_active ? 'success' : 'secondary'}`}>
                      {u.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.82rem' }}>{new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-primary"
                        style={{ fontSize: '0.78rem', padding: '3px 8px' }}
                        onClick={() => setEditUser(u)}
                      >
                        Modifier
                      </button>
                      <button
                        className="btn btn-warning"
                        style={{ fontSize: '0.78rem', padding: '3px 8px' }}
                        onClick={() => setResetUser(u)}
                      >
                        Mot de passe
                      </button>
                      <button
                        className={`btn btn-${u.is_active ? 'outline' : 'success'}`}
                        style={{ fontSize: '0.78rem', padding: '3px 8px' }}
                        onClick={() => toggleActive(u)}
                      >
                        {u.is_active ? 'Désactiver' : 'Activer'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: '#7f8c8d', padding: 24 }}>
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <UserForm
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); reload(); }}
        />
      )}

      {editUser && (
        <UserForm
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={() => { setEditUser(null); reload(); }}
        />
      )}

      {resetUser && (
        <ResetPasswordForm
          user={resetUser}
          onClose={() => setResetUser(null)}
          onSaved={() => setResetUser(null)}
        />
      )}
    </>
  );
}

function UserForm({ user, onClose, onSaved }) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'teacher',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isEdit) {
        await api.updateUser(user.id, {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
        });
      } else {
        await api.createUser(form);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modal}>
        <div style={mHeader}>
          <span style={{ fontWeight: 700 }}>{isEdit ? 'Modifier le compte' : 'Créer un compte'}</span>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          <div className="form-group">
            <label>Prénom *</label>
            <input type="text" value={form.first_name} onChange={set('first_name')} required autoFocus={!isEdit} />
          </div>
          <div className="form-group">
            <label>Nom *</label>
            <input type="text" value={form.last_name} onChange={set('last_name')} required />
          </div>
          <div className="form-group">
            <label>Email *</label>
            <input type="email" value={form.email} onChange={set('email')} required />
          </div>
          {!isEdit && (
            <>
              <div className="form-group">
                <label>
                  Mot de passe *{' '}
                  <span style={{ color: '#aaa', fontWeight: 400 }}>(min. 8 caractères)</span>
                </label>
                <input type="password" value={form.password} onChange={set('password')} required minLength={8} />
              </div>
              <div className="form-group">
                <label>Rôle</label>
                <select value={form.role} onChange={set('role')}>
                  <option value="teacher">Formateur</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
            </>
          )}
          {error && <div className="alert-banner danger" style={{ marginBottom: 12 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading}>
              {loading ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Créer le compte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResetPasswordForm({ user, onClose, onSaved }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return; }
    if (password.length < 8) { setError('Le mot de passe doit faire au moins 8 caractères.'); return; }
    setLoading(true);
    try {
      await api.updateUser(user.id, { new_password: password });
      setSuccess(true);
      setTimeout(onSaved, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modal}>
        <div style={mHeader}>
          <span style={{ fontWeight: 700 }}>Réinitialiser le mot de passe</span>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>
        <div style={{ padding: 24 }}>
          <p style={{ marginBottom: 16, fontSize: '0.9rem', color: '#555' }}>
            Définir un nouveau mot de passe pour{' '}
            <strong>{user.first_name} {user.last_name}</strong>
          </p>
          {success ? (
            <div className="alert-banner success">✅ Mot de passe modifié avec succès.</div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nouveau mot de passe *</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Confirmer le mot de passe *</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
              {error && <div className="alert-banner danger" style={{ marginBottom: 12 }}>{error}</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-warning" style={{ flex: 2 }} disabled={loading}>
                  {loading ? 'Modification...' : 'Changer le mot de passe'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

const overlay = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1100, padding: 16,
};
const modal = {
  background: 'white', borderRadius: 10,
  width: '100%', maxWidth: 460,
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  overflow: 'hidden',
};
const mHeader = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '14px 20px',
  background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
  color: 'white',
};
const closeBtn = {
  background: 'none', border: 'none', color: 'white',
  fontSize: '1.2rem', cursor: 'pointer', padding: '0 4px',
};
