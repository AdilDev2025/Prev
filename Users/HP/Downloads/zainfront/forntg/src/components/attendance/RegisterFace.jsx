import { useState } from 'react';
import { attendanceApi } from '../../api/client';
import WebcamCapture from './WebcamCapture';

/**
 * RegisterFace — Step 1 of the attendance flow.
 * After success it waits 2s (progress bar) then calls onSuccess()
 * which causes the parent to flip the card to Check In.
 */
export default function RegisterFace({ workspaceId, onSuccess }) {
  const [file, setFile]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [err, setErr]         = useState('');

  async function handleRegister() {
    if (!file) return;
    setLoading(true); setErr('');
    try {
      const r = await attendanceApi.registerFace(workspaceId, file);
      setResult(r);
      // Auto-advance after progress bar fills (2s)
      setTimeout(() => onSuccess?.(), 2000);
    } catch (e) {
      setErr(e.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14, flexShrink: 0,
          background: 'rgba(79,142,247,.12)', border: '1px solid var(--accent-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
        }}>🧠</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--txt)' }}>Register Your Face</div>
          <div className="txt-muted" style={{ fontSize: 13 }}>
            One-time setup · Your embedding is stored securely in Qdrant
          </div>
        </div>
      </div>

      {/* Tip */}
      {!result && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, fontSize: 13,
          background: 'rgba(79,142,247,.06)', border: '1px solid var(--accent-border)',
          color: 'var(--txt-3)',
        }}>
          💡 Face the camera straight-on in good lighting for best results.
        </div>
      )}

      {/* Camera + button */}
      {!result && (
        <>
          <WebcamCapture
            captureLabel="Capture My Face"
            onCapture={f => { setFile(f); setErr(''); }}
          />
          {err && <div className="alert alert-err">{err}</div>}
          {file && (
            <button
              className="btn btn-p"
              onClick={handleRegister}
              disabled={loading}
              style={{ alignSelf: 'flex-start' }}
            >
              {loading
                ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                    Registering...
                  </span>
                : '🧬 Register Face & Continue →'}
            </button>
          )}
        </>
      )}

      {/* Success + auto-advance progress */}
      {result && (
        <>
          <style>{`
            @keyframes rf-progress { from{width:0%} to{width:100%} }
          `}</style>
          <div style={{
            textAlign: 'center', padding: '28px 16px',
            background: 'var(--green-bg)', border: '1px solid var(--green-b)',
            borderRadius: 12,
          }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
            <strong style={{ fontSize: 19, color: 'var(--green)' }}>Face Registered!</strong>
            <p className="txt-muted" style={{ fontSize: 13, marginTop: 6 }}>
              Embedding stored · Taking you to Check In...
            </p>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 14, flexWrap: 'wrap' }}>
              <span className="badge badge-green">User: {result.user_id}</span>
              <span className="badge badge-green">WS: {result.workspace_id}</span>
            </div>
          </div>
          {/* Auto-advance bar */}
          <div style={{ height: 4, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99, background: 'var(--green)',
              animation: 'rf-progress 2s linear forwards',
            }} />
          </div>
        </>
      )}
    </div>
  );
}