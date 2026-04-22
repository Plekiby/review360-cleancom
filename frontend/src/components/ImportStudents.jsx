import { useState, useRef } from 'react';
import { api } from '../lib/api';

const STEPS = { IDLE: 'idle', PREVIEW: 'preview', IMPORTING: 'importing', DONE: 'done' };

export default function ImportStudents({ classes, onClose, onImported }) {
  const [selectedClass, setSelectedClass] = useState(classes[0]?.id || '');
  const [file, setFile] = useState(null);
  const [step, setStep] = useState(STEPS.IDLE);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleFile = (f) => {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls'].includes(ext)) {
      setError('Format invalide — fichier .xlsx ou .xls requis');
      return;
    }
    setFile(f);
    setError('');
    setStep(STEPS.IDLE);
    setPreview(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handlePreview = async () => {
    if (!file || !selectedClass) return;
    setError('');
    try {
      const data = await api.previewStudents(selectedClass, file);
      setPreview(data);
      setStep(STEPS.PREVIEW);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleImport = async () => {
    setStep(STEPS.IMPORTING);
    setError('');
    try {
      const data = await api.importStudents(selectedClass, file);
      setResult(data);
      setStep(STEPS.DONE);
      onImported?.();
    } catch (err) {
      setError(err.message);
      setStep(STEPS.PREVIEW);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError('');
    setStep(STEPS.IDLE);
  };

  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h3 style={{ margin: 0 }}>📥 Import étudiants Excel</h3>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {/* Contenu */}
        <div style={styles.body}>

          {/* Sélecteur de classe */}
          <div className="form-group">
            <label>Classe cible</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid #e0e0e0' }}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name} — {c.teacher_name}</option>
              ))}
            </select>
          </div>

          {/* Format attendu */}
          <div style={{ background: '#f0f8ff', borderRadius: 6, padding: '10px 14px', fontSize: '0.82rem', marginBottom: 16 }}>
            <strong>Format attendu (colonnes) :</strong> Num · Nom · Prénom · Email (optionnel)
          </div>

          {/* Zone drag-and-drop */}
          {step !== STEPS.DONE && (
            <div
              style={{
                ...styles.dropzone,
                borderColor: dragging ? '#667eea' : file ? '#27ae60' : '#e0e0e0',
                background: dragging ? '#f0f0ff' : file ? '#f0fdf4' : '#fafafa',
              }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={(e) => handleFile(e.target.files[0])}
              />
              {file ? (
                <>
                  <div style={{ fontSize: '2rem' }}>✅</div>
                  <div style={{ fontWeight: 600, marginTop: 4 }}>{file.name}</div>
                  <div style={{ fontSize: '0.78rem', color: '#7f8c8d' }}>
                    {(file.size / 1024).toFixed(1)} Ko · Cliquer pour changer
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '2.5rem' }}>📂</div>
                  <div style={{ fontWeight: 600, marginTop: 4 }}>Glisser le fichier Excel ici</div>
                  <div style={{ fontSize: '0.8rem', color: '#7f8c8d' }}>ou cliquer pour parcourir</div>
                </>
              )}
            </div>
          )}

          {error && <div className="alert-banner danger" style={{ marginTop: 10 }}>{error}</div>}

          {/* Bouton preview */}
          {file && step === STEPS.IDLE && (
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 12, padding: 10 }} onClick={handlePreview}>
              🔍 Prévisualiser les données
            </button>
          )}

          {/* Preview tableau */}
          {step === STEPS.PREVIEW && preview && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                <span className="badge badge-success">✅ {preview.valid_count} valides</span>
                {preview.error_count > 0 && (
                  <span className="badge badge-danger">❌ {preview.error_count} erreurs</span>
                )}
                <span className="badge badge-info">{preview.rows.length} lignes au total</span>
              </div>

              <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: 6 }}>
                <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa', position: 'sticky', top: 0 }}>
                      <th style={styles.th}>Num</th>
                      <th style={styles.th}>Nom</th>
                      <th style={styles.th}>Prénom</th>
                      <th style={styles.th}>Email</th>
                      <th style={styles.th}>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, i) => (
                      <tr key={i} style={{ background: row.valid ? 'white' : '#fff5f5', borderBottom: '1px solid #f0f0f0' }}>
                        <td style={styles.td}>{row.studentNumber || '—'}</td>
                        <td style={styles.td}>{row.lastName || '—'}</td>
                        <td style={styles.td}>{row.firstName || '—'}</td>
                        <td style={styles.td}>{row.email || '—'}</td>
                        <td style={styles.td}>
                          {row.valid
                            ? <span className="badge badge-success">OK</span>
                            : <span className="badge badge-danger" title={row.error}>Erreur</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {preview.error_count > 0 && (
                <div style={{ marginTop: 8, fontSize: '0.8rem', color: '#e74c3c' }}>
                  Les lignes en erreur seront ignorées lors de l'import.
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button className="btn btn-outline" onClick={reset} style={{ flex: 1 }}>← Recommencer</button>
                <button
                  className="btn btn-success"
                  style={{ flex: 2, padding: 10 }}
                  onClick={handleImport}
                  disabled={preview.valid_count === 0}
                >
                  ✅ Importer {preview.valid_count} étudiant{preview.valid_count > 1 ? 's' : ''}
                </button>
              </div>
            </div>
          )}

          {/* Chargement */}
          {step === STEPS.IMPORTING && (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>⏳</div>
              <div>Import en cours... création des fiches ADOC & DRCV</div>
            </div>
          )}

          {/* Résultat */}
          {step === STEPS.DONE && result && (
            <div style={{ textAlign: 'center', padding: 16 }}>
              <div style={{ fontSize: '3rem', marginBottom: 8 }}>🎉</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12 }}>Import terminé !</div>
              <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="stat-box success">
                  <div className="stat-value">{result.imported}</div>
                  <div className="stat-label">Étudiants importés</div>
                </div>
                <div className={`stat-box ${result.errors > 0 ? 'danger' : 'success'}`}>
                  <div className="stat-value">{result.errors}</div>
                  <div className="stat-label">Erreurs</div>
                </div>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#7f8c8d', marginTop: 10 }}>
                {result.imported * 9} fiches créées ({result.imported * 5} ADOC + {result.imported * 4} DRCV)
              </div>
              {result.error_details?.length > 0 && (
                <div style={{ marginTop: 12, textAlign: 'left', background: '#fff5f5', borderRadius: 6, padding: 10, fontSize: '0.78rem' }}>
                  {result.error_details.map((e, i) => <div key={i} style={{ color: '#e74c3c' }}>• {e}</div>)}
                </div>
              )}
              <button className="btn btn-primary" style={{ marginTop: 16, width: '100%' }} onClick={onClose}>
                Fermer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  },
  modal: {
    background: 'white',
    borderRadius: 10,
    width: '100%',
    maxWidth: 580,
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #e0e0e0',
    background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
    color: 'white',
    borderRadius: '10px 10px 0 0',
  },
  closeBtn: {
    background: 'none', border: 'none', color: 'white',
    fontSize: '1.2rem', cursor: 'pointer', padding: '0 4px',
  },
  body: {
    padding: 20,
    overflowY: 'auto',
    flex: 1,
  },
  dropzone: {
    border: '2px dashed',
    borderRadius: 8,
    padding: '28px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  th: { padding: '8px 10px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, color: '#7f8c8d' },
  td: { padding: '7px 10px' },
};
