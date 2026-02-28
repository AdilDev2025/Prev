import { useState } from 'react';
import { attendanceApi } from '../../api/client';
import WebcamCapture from './WebcamCapture';

export default function RegisterFace({ workspaceId, onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function handleRegister() {
    if (!file) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await attendanceApi.registerFace(workspaceId, file);
      setResult(data);
      if (onSuccess) setTimeout(onSuccess, 2000);
    } catch (err) {
      // Show specific message for facial API being down
      if (err.status === 503 || err.message?.includes('not running') || err.message?.includes('unavailable')) {
        setError('⚠️ Facial Recognition Service Offline — The service auto-starts with the backend. Please wait 10-15 seconds and try again.');
      } else if (err.message?.includes('already registered')) {
        setResult({ message: 'Your face is already registered! Go ahead and mark attendance.' });
        if (onSuccess) setTimeout(onSuccess, 1500);
      } else if (err.message?.includes('No face') || err.message?.includes('no valid faces')) {
        setError('😐 No face detected in the image. Please ensure your face is clearly visible, well-lit, and facing the camera.');
      } else {
        setError(err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 28 }}>📸</span>
        <div>
          <strong>Register Your Face</strong>
          <p className="text-muted" style={{ margin: 0 }}>Position your face clearly in the camera frame, then capture.</p>
        </div>
      </div>

      <WebcamCapture
        onCapture={(f) => { setFile(f); setResult(null); setError(''); }}
        captureLabel="Capture Face"
      />

      {error && (
        <div className="alert alert-error" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}

      {result && (
        <div className="alert alert-success" style={{ marginTop: 12 }}>
          <strong style={{ fontSize: 16 }}>✅ {result.message}</strong>
          {result.user_id && (
            <p className="text-muted" style={{ margin: '4px 0 0' }}>
              Face ID: {result.user_id}
            </p>
          )}
        </div>
      )}

      {file && !result && (
        <button
          className="btn btn-primary"
          onClick={handleRegister}
          disabled={loading}
          style={{ marginTop: 12 }}
        >
          {loading ? '⏳ Registering face with AI...' : '✅ Confirm & Register Face'}
        </button>
      )}
    </div>
  );
}
