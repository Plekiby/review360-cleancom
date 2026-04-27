import { useState } from 'react';
import { api } from '../lib/api';

const CHECKPOINTS = [
  {
    key: 'has_subject',
    label: 'Sujet clairement défini',
    help: 'L\'étudiant a nommé le sujet/produit/service traité, identifié l\'entreprise et son secteur d\'activité.',
  },
  {
    key: 'context_well_formulated',
    label: 'Contexte bien formulé',
    help: 'Le contexte de la mission est posé : marché, enjeux, contraintes, parties prenantes.',
  },
  {
    key: 'objectives_validated',
    label: 'Objectifs validés',
    help: 'Les objectifs sont SMART (spécifiques, mesurables, atteignables, réalistes, temporels) et alignés avec le sujet.',
  },
];

export default function ValidationForm({ validation, onClose, onSaved }) {
  // validation = { id, activity_sheet_id, sheet_type, sheet_number, sheet_title, last_name, first_name }
  const [checks, setChecks] = useState({
    has_subject: false,
    context_well_formulated: false,
    objectives_validated: false,
  });
  const [grade, setGrade] = useState('');
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const allChecked = Object.values(checks).every(Boolean);

  const toggle = (key) => setChecks((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.createValidation({
        activity_sheet_id: validation.activity_sheet_id,
        has_subject: checks.has_subject,
        context_well_formulated: checks.context_well_formulated,
        objectives_validated: checks.objectives_validated,
        session_grade: grade ? parseFloat(grade) : null,
        comments: comments || null,
      });
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkedCount = Object.values(checks).filter(Boolean).length;

  return (
    <div style={overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modal}>
        {/* Header */}
        <div style={header}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>
              Validation — {validation.sheet_type} {validation.sheet_number}
            </div>
            <div style={{ fontSize: '0.82rem', opacity: 0.8 }}>
              {validation.last_name} {validation.first_name}
              {validation.sheet_title && ` · ${validation.sheet_title}`}
            </div>
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          {/* Progression checkpoints */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Points de validation</h4>
              <span className={`badge badge-${checkedCount === 3 ? 'success' : checkedCount > 0 ? 'warning' : 'secondary'}`}>
                {checkedCount}/3 validés
              </span>
            </div>

            {CHECKPOINTS.map((cp) => (
              <label key={cp.key} style={checkboxRow(checks[cp.key])}>
                <input
                  type="checkbox"
                  checked={checks[cp.key]}
                  onChange={() => toggle(cp.key)}
                  style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#27ae60', marginTop: 2, flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: checks[cp.key] ? 600 : 500, display: 'flex', alignItems: 'center' }}>
                    {cp.label}
                    {checks[cp.key] && <span style={{ marginLeft: 'auto', color: '#27ae60' }}>✅</span>}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#7f8c8d', marginTop: 3, lineHeight: 1.35 }}>
                    {cp.help}
                  </div>
                </div>
              </label>
            ))}
          </div>

          {/* Résultat projeté */}
          <div className={`alert-banner ${allChecked ? 'success' : checkedCount > 0 ? 'warning' : 'danger'}`} style={{ marginBottom: 20 }}>
            {allChecked
              ? '✅ Les 3 points sont validés — la fiche passera à "Validée"'
              : checkedCount > 0
                ? `⚠️ ${3 - checkedCount} point(s) manquant(s) — la fiche restera "En cours"`
                : '❌ Aucun point validé — une alerte sera générée'}
          </div>

          {/* Note */}
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label>Note de session /10 <span style={{ color: '#aaa', fontWeight: 400 }}>(optionnel)</span></label>
            <input
              type="number"
              min="0"
              max="10"
              step="0.5"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="ex: 7.5"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 4, border: '1px solid #e0e0e0', fontSize: '1rem' }}
            />
            {grade !== '' && parseFloat(grade) >= 7 && checkedCount < 2 && (
              <div style={{ fontSize: '0.78rem', color: '#c0392b', marginTop: 6, padding: '6px 10px', background: '#fff5f5', borderRadius: 4, border: '1px solid #f5c6cb' }}>
                ⚠️ Note élevée ({grade}/10) avec seulement {checkedCount}/3 critère{checkedCount !== 1 ? 's' : ''} validé{checkedCount !== 1 ? 's' : ''}. Cohérence à vérifier.
              </div>
            )}
            {grade !== '' && parseFloat(grade) < 4 && checkedCount === 3 && (
              <div style={{ fontSize: '0.78rem', color: '#c0392b', marginTop: 6, padding: '6px 10px', background: '#fff5f5', borderRadius: 4, border: '1px solid #f5c6cb' }}>
                ⚠️ Tous les critères validés mais note faible ({grade}/10). Cohérence à vérifier.
              </div>
            )}
          </div>

          {/* Commentaire */}
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label>Commentaire <span style={{ color: '#aaa', fontWeight: 400 }}>(optionnel)</span></label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Observations sur la session, axes d'amélioration..."
              rows={3}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 4, border: '1px solid #e0e0e0', resize: 'vertical', fontFamily: 'inherit', fontSize: '0.88rem' }}
            />
          </div>

          {error && <div className="alert-banner danger" style={{ marginBottom: 12 }}>{error}</div>}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>
              Annuler
            </button>
            <button
              type="submit"
              className={`btn btn-${allChecked ? 'success' : 'warning'}`}
              style={{ flex: 2, padding: 10, fontWeight: 600 }}
              disabled={loading}
            >
              {loading ? 'Enregistrement...' : allChecked ? '✅ Valider la fiche' : '⚠️ Enregistrer (incomplet)'}
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
  zIndex: 1000, padding: 16,
};
const modal = {
  background: 'white', borderRadius: 10,
  width: '100%', maxWidth: 480,
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  overflow: 'hidden',
};
const header = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '16px 20px',
  background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
  color: 'white',
};
const closeBtn = {
  background: 'none', border: 'none', color: 'white',
  fontSize: '1.2rem', cursor: 'pointer', padding: '0 4px',
};
const checkboxRow = (checked) => ({
  display: 'flex', alignItems: 'flex-start', gap: 12,
  padding: '12px 14px', marginBottom: 8,
  borderRadius: 8, cursor: 'pointer',
  background: checked ? '#f0fdf4' : '#fafafa',
  border: `1px solid ${checked ? '#27ae60' : '#e0e0e0'}`,
  transition: 'all 0.15s',
});
