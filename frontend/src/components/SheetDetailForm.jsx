import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

const AUTOSAVE_DELAY_MS = 1500;
const READONLY_STATUS = 'validated';

export default function SheetDetailForm({ sheet, onClose, onSaved }) {
  const [title, setTitle] = useState(sheet.title || '');
  const [context, setContext] = useState(sheet.context || '');
  const [objectives, setObjectives] = useState(sheet.objectives || '');
  const [methodology, setMethodology] = useState(sheet.methodology || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-save : 'idle' | 'dirty' | 'saving' | 'saved' | 'error'
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle');
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const initialMountRef = useRef(true);
  const isReadOnly = sheet.status === READONLY_STATUS;

  const color = sheet.sheet_type === 'ADOC' ? '#3498db' : '#f39c12';

  // À chaque modif d'un champ, on programme une sauvegarde après AUTOSAVE_DELAY_MS d'inactivité.
  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      return;
    }
    if (isReadOnly) return;
    setAutoSaveStatus('dirty');
    const timer = setTimeout(async () => {
      setAutoSaveStatus('saving');
      try {
        await api.updateActivitySheet(sheet.id, {
          title: title || null,
          context: context || null,
          objectives: objectives || null,
          methodology: methodology || null,
        });
        setAutoSaveStatus('saved');
        setLastSavedAt(new Date());
        setError('');
      } catch (err) {
        setAutoSaveStatus('error');
        setError(err.message);
      }
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, context, objectives, methodology]);

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

  const handleClose = () => {
    if (autoSaveStatus === 'dirty' || autoSaveStatus === 'saving') {
      if (!window.confirm('Une sauvegarde est en cours. Fermer quand même ?')) return;
    }
    if (lastSavedAt) onSaved?.();
    onClose();
  };

  const autoSaveBadge = (() => {
    if (isReadOnly) return null;
    const base = { fontSize: '0.74rem', padding: '2px 8px', borderRadius: 10, fontWeight: 500 };
    switch (autoSaveStatus) {
      case 'dirty':   return <span style={{ ...base, background: 'rgba(255,255,255,0.2)' }}>✏️ Non sauvegardé</span>;
      case 'saving':  return <span style={{ ...base, background: 'rgba(255,255,255,0.2)' }}>⏳ Sauvegarde...</span>;
      case 'saved':   return <span style={{ ...base, background: 'rgba(39,174,96,0.85)' }}>💾 Sauvegardé {lastSavedAt ? `à ${lastSavedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : ''}</span>;
      case 'error':   return <span style={{ ...base, background: 'rgba(231,76,60,0.9)' }}>⚠️ Erreur sauvegarde</span>;
      default:        return null;
    }
  })();

  return (
    <div style={overlay} onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div style={modal}>
        <div style={{ ...header, background: `linear-gradient(135deg, ${color} 0%, ${sheet.sheet_type === 'ADOC' ? '#2980b9' : '#d68910'} 100%)` }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>
              {sheet.sheet_type === 'ADOC' ? '📘' : '📙'} {sheet.sheet_type} {sheet.sheet_number} — Contenu de la fiche
            </div>
            <div style={{ fontSize: '0.82rem', opacity: 0.8, marginTop: 2, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span>Statut : {sheet.status === 'validated' ? '✅ Validée' : sheet.status === 'in_progress' ? '🔄 En cours' : '⬜ Non démarrée'}</span>
              {autoSaveBadge}
            </div>
          </div>
          <button onClick={handleClose} style={closeBtn}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24, overflowY: 'auto', maxHeight: 'calc(80vh - 70px)' }}>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <FieldLabel label="Titre de l'activité / sujet" optional value={title} max={120} />
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex: Analyse du marché local de la boulangerie Dupont"
              style={inputStyle}
              disabled={isReadOnly}
              maxLength={120}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <FieldLabel label="Contexte" value={context} max={1500} hint="Entreprise, secteur, enjeux, parties prenantes" />
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Décrivez le contexte de l'entreprise, le secteur d'activité, les enjeux..."
              rows={4}
              style={textareaStyle}
              disabled={isReadOnly}
              maxLength={1500}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <FieldLabel label="Objectifs" value={objectives} max={1500} hint="SMART : spécifiques, mesurables, atteignables, réalistes, temporels" />
            <textarea
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              placeholder="Quels sont les objectifs ? Qu'est-ce que l'étudiant doit démontrer ?"
              rows={4}
              style={textareaStyle}
              disabled={isReadOnly}
              maxLength={1500}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <FieldLabel label="Méthodologie" optional value={methodology} max={800} />
            <textarea
              value={methodology}
              onChange={(e) => setMethodology(e.target.value)}
              placeholder="Quelle approche ? Outils, méthodes d'analyse..."
              rows={3}
              style={textareaStyle}
              disabled={isReadOnly}
              maxLength={800}
            />
          </div>

          {error && <div className="alert-banner danger" style={{ marginBottom: 12 }}>{error}</div>}

          {isReadOnly ? (
            <div className="alert-banner success" style={{ marginBottom: 0 }}>
              ✅ Cette fiche est validée — contenu en lecture seule.
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: '#7f8c8d' }}>💡 Sauvegarde automatique active</span>
              <button type="button" className="btn btn-outline" style={{ marginLeft: 'auto' }} onClick={handleClose}>Fermer</button>
              <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontWeight: 600 }} disabled={loading || autoSaveStatus === 'saving'}>
                {loading ? 'Enregistrement...' : '💾 Enregistrer maintenant'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

function FieldLabel({ label, optional, value, max, hint }) {
  const len = (value || '').length;
  const ratio = max ? len / max : 0;
  const color = ratio > 0.9 ? '#e74c3c' : ratio > 0.7 ? '#f39c12' : '#aaa';
  return (
    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
      <span>
        {label}
        {optional && <span style={{ color: '#aaa', fontWeight: 400 }}> (optionnel)</span>}
        {hint && <span style={{ color: '#aaa', fontWeight: 400, fontSize: '0.78rem', marginLeft: 6 }}>· {hint}</span>}
      </span>
      {max && (
        <span style={{ fontSize: '0.74rem', color, fontWeight: 500 }}>
          {len}/{max}
        </span>
      )}
    </label>
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
