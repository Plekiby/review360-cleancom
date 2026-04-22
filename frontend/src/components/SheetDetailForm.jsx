import { useState } from 'react';
import { api } from '../lib/api';

export default function SheetDetailForm({ sheet, onClose, onSaved }) {
  const [title, setTitle] = useState(sheet.title || '');
  const [context, setContext] = useState(sheet.context || '');
  const [objectives, setObjectives] = useState(sheet.objectives || '');
  const [methodology, setMethodology] = useState(sheet.methodology || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const color = sheet.sheet_type === 'ADOC' ? '#3498db' : '#f39c12';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.updateActivitySheet(sheet.id, {
        title: title || null,
        context: context || null,
        objectives: objectives || null,
        methodology: methodology || null,
      });
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modal}>
        <div style={{ ...header, background: `linear-gradient(135deg, ${color} 0%, ${sheet.sheet_type === 'ADOC' ? '#2980b9' : '#d68910'} 100%)` }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>
              {sheet.sheet_type === 'ADOC' ? '📘' : '📙'} {sheet.sheet_type} {sheet.sheet_number} — Contenu de la fiche
            </div>
            <div style={{ fontSize: '0.82rem', opacity: 0.8 }}>
              Statut : {sheet.status === 'validated' ? '✅ Validée' : sheet.status === 'in_progress' ? '🔄 En cours' : '⬜ Non démarrée'}
            </div>
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24, overflowY: 'auto', maxHeight: 'calc(80vh - 70px)' }}>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label>Titre de l'activité / sujet <span style={{ color: '#aaa', fontWeight: 400 }}>(optionnel)</span></label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex: Analyse du marché local de la boulangerie Dupont"
              style={inputStyle}
              disabled={sheet.status === 'validated'}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label>Contexte</label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Décrivez le contexte de l'entreprise, le secteur d'activité, les enjeux..."
              rows={4}
              style={textareaStyle}
              disabled={sheet.status === 'validated'}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label>Objectifs</label>
            <textarea
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              placeholder="Quels sont les objectifs de cette activité ? Qu'est-ce que l'étudiant doit démontrer ?"
              rows={4}
              style={textareaStyle}
              disabled={sheet.status === 'validated'}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label>Méthodologie <span style={{ color: '#aaa', fontWeight: 400 }}>(optionnel)</span></label>
            <textarea
              value={methodology}
              onChange={(e) => setMethodology(e.target.value)}
              placeholder="Quelle approche méthodologique est prévue ? Outils, méthodes d'analyse..."
              rows={3}
              style={textareaStyle}
              disabled={sheet.status === 'validated'}
            />
          </div>

          {error && <div className="alert-banner danger" style={{ marginBottom: 12 }}>{error}</div>}

          {sheet.status === 'validated' ? (
            <div className="alert-banner success" style={{ marginBottom: 0 }}>
              ✅ Cette fiche est validée — contenu en lecture seule.
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Annuler</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2, padding: 10, fontWeight: 600 }} disabled={loading}>
                {loading ? 'Enregistrement...' : '💾 Enregistrer'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

const overlay = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1200, padding: 16,
};
const modal = {
  background: 'white', borderRadius: 10,
  width: '100%', maxWidth: 560,
  maxHeight: '85vh',
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  overflow: 'hidden',
  display: 'flex', flexDirection: 'column',
};
const header = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '16px 20px', color: 'white', flexShrink: 0,
};
const closeBtn = { background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer' };
const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 4, border: '1px solid #e0e0e0', fontSize: '0.9rem' };
const textareaStyle = { width: '100%', padding: '9px 12px', borderRadius: 4, border: '1px solid #e0e0e0', resize: 'vertical', fontFamily: 'inherit', fontSize: '0.88rem' };
