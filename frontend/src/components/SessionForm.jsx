import { useState } from 'react';
import { api } from '../lib/api';

export default function SessionForm({ student, activitySheetId, sheets, onClose, onSaved }) {
  const today = new Date().toISOString().split('T')[0];

  // Si sheets fourni (sélecteur), initialiser sur la première fiche non validée
  const defaultSheetId = activitySheetId || (sheets && sheets.length > 0 ? sheets[0].id : null);

  const [selectedSheetId, setSelectedSheetId] = useState(defaultSheetId);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [objective, setObjective] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSheetId) { setError('Veuillez sélectionner une fiche.'); return; }
    setError('');
    setLoading(true);
    try {
      await api.createSession({
        student_id: student.id,
        activity_sheet_id: selectedSheetId,
        session_date: date,
        session_time: time || null,
        location: location || null,
        objective: objective || null,
      });
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedSheet = sheets?.find((s) => s.id === selectedSheetId);

  return (
    <div style={overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modal}>
        <div style={header}>
          <div>
            <div style={{ fontWeight: 700 }}>📅 Nouvelle session de suivi</div>
            <div style={{ fontSize: '0.82rem', opacity: 0.8 }}>
              {student.last_name} {student.first_name}
              {selectedSheet && ` · ${selectedSheet.sheet_type} ${selectedSheet.sheet_number}`}
            </div>
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          {/* Sélecteur de fiche (quand appelé depuis l'onglet Sessions) */}
          {sheets && sheets.length > 0 && (
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>Fiche concernée *</label>
              <select
                value={selectedSheetId || ''}
                onChange={(e) => setSelectedSheetId(e.target.value)}
                required
                style={{ width: '100%', padding: '9px 12px', borderRadius: 4, border: '1px solid #e0e0e0', fontSize: '0.9rem' }}
              >
                <option value="">Choisir une fiche...</option>
                {sheets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.sheet_type} {s.sheet_number}{s.title ? ` — ${s.title}` : ''} ({s.status === 'not_started' ? 'Non démarrée' : 'En cours'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Heure <span style={{ color: '#aaa', fontWeight: 400 }}>(optionnel)</span></label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label>Lieu <span style={{ color: '#aaa', fontWeight: 400 }}>(optionnel)</span></label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="ex: Salle B204, Teams, Bureau formateur..."
              style={{ ...inputStyle, width: '100%' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label>Objectif de la session <span style={{ color: '#aaa', fontWeight: 400 }}>(optionnel)</span></label>
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="ex: Validation du sujet ADOC 2, point sur le contexte..."
              rows={3}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 4, border: '1px solid #e0e0e0', resize: 'vertical', fontFamily: 'inherit', fontSize: '0.88rem' }}
            />
          </div>

          {error && <div className="alert-banner danger" style={{ marginBottom: 12 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2, padding: 10, fontWeight: 600 }} disabled={loading}>
              {loading ? 'Création...' : '📅 Créer la session'}
            </button>
          </div>
        </form>
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
const header = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '16px 20px',
  background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
  color: 'white',
};
const closeBtn = { background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer' };
const inputStyle = { padding: '9px 12px', borderRadius: 4, border: '1px solid #e0e0e0', fontSize: '0.9rem', width: '100%' };
