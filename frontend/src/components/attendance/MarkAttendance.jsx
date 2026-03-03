import { useState, useEffect, useRef } from 'react';
import { attendanceApi } from '../../api/client';
import WebcamCapture from './WebcamCapture';

const REGULAR_HOURS = 8;

function formatDuration(hours) {
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  const s = Math.floor(((hours - h) * 60 - m) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function MarkAttendance({ workspaceId }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Session status
  const [checkedIn, setCheckedIn] = useState(false);
  const [session, setSession] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0); // live elapsed hours
  const timerRef = useRef(null);

  // Fetch current attendance status on mount
  useEffect(() => {
    loadStatus();
    return () => clearInterval(timerRef.current);
  }, [workspaceId]);

  async function loadStatus() {
    setStatusLoading(true);
    try {
      const data = await attendanceApi.getStatus(workspaceId);
      setCheckedIn(data.checked_in);
      setSession(data.session);
      if (data.checked_in && data.session) {
        startTimer(new Date(data.session.check_in));
      } else {
        clearInterval(timerRef.current);
        setElapsed(0);
      }
    } catch {
      // If status check fails, assume not checked in
      setCheckedIn(false);
      setSession(null);
    } finally {
      setStatusLoading(false);
    }
  }

  function startTimer(checkInTime) {
    clearInterval(timerRef.current);
    const update = () => {
      const hrs = (Date.now() - new Date(checkInTime).getTime()) / (1000 * 60 * 60);
      setElapsed(hrs);
    };
    update();
    timerRef.current = setInterval(update, 1000);
  }

  // ─── Check In ───
  async function handleCheckIn() {
    if (!file) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await attendanceApi.markAttendance(workspaceId, file);
      setResult(data);
      setFile(null);
      // If already checked in (409), just refresh status
      if (data.status === 'already_checked_in' || data.action === 'check_in') {
        await loadStatus();
      }
    } catch (err) {
      if (err.status === 409) {
        // Already checked in
        await loadStatus();
        setError('You are already checked in. Use Check Out below.');
      } else if (err.status === 403 && err.message?.includes('does not match')) {
        setFile(null);
        setError('🚫 Face does not match your account. You can only mark your own attendance.');
      } else if (err.status === 503 || err.message?.includes('not running')) {
        setError('⚠️ Facial Recognition Service Offline — please wait and try again.');
      } else {
        setError(err.message || 'Check-in failed.');
      }
    } finally {
      setLoading(false);
    }
  }

  // ─── Check Out ───
  async function handleCheckOut() {
    if (!file) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await attendanceApi.checkOut(workspaceId, file);
      setResult(data);
      setFile(null);
      clearInterval(timerRef.current);
      setCheckedIn(false);
      setSession(null);
      setElapsed(0);
    } catch (err) {
      if (err.status === 404 && err.message?.includes('No active')) {
        await loadStatus();
        setError('No active session found. You may need to check in first.');
      } else if (err.status === 403 && err.message?.includes('does not match')) {
        setFile(null);
        setError('🚫 Face does not match your account. You can only check out with your own face.');
      } else if (err.status === 503) {
        setError('⚠️ Facial Recognition Service Offline.');
      } else {
        setError(err.message || 'Check-out failed.');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setFile(null);
    setResult(null);
    setError('');
  }

  const regularHrs = Math.min(elapsed, REGULAR_HOURS);
  const afterHrs = Math.max(0, elapsed - REGULAR_HOURS);
  const isAfterHours = afterHrs > 0;

  if (statusLoading) return <div className="card"><p>Loading attendance status...</p></div>;

  return (
    <div>
      {/* ─── Active Session Banner ─── */}
      {checkedIn && session && (
        <div style={{
          padding: 16, borderRadius: 8, marginBottom: 16,
          background: isAfterHours ? '#fef3c7' : '#f0fdf4',
          border: `2px solid ${isAfterHours ? '#f59e0b' : '#22c55e'}`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <strong style={{ fontSize: 16 }}>🟢 Active Session</strong>
              <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                Checked in at {new Date(session.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'monospace', color: isAfterHours ? '#d97706' : '#15803d' }}>
                {formatDuration(elapsed)}
              </div>
              <span style={{ fontSize: 12 }} className="text-muted">elapsed</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
            <div style={{ padding: '6px 12px', borderRadius: 6, background: '#dcfce7', fontSize: 13 }}>
              <strong>Regular:</strong> {formatDuration(regularHrs)} / 08:00:00
            </div>
            {isAfterHours && (
              <div style={{ padding: '6px 12px', borderRadius: 6, background: '#fef9c3', fontSize: 13, color: '#92400e' }}>
                <strong>⚠️ After Hours:</strong> {formatDuration(afterHrs)}
              </div>
            )}
            {elapsed >= 8 && elapsed < 12 && (
              <div style={{ padding: '6px 12px', borderRadius: 6, background: '#fef3c7', fontSize: 12, color: '#92400e' }}>
                ℹ️ 8h threshold reached. After-hours counting.
              </div>
            )}
            {elapsed >= 11 && (
              <div style={{ padding: '6px 12px', borderRadius: 6, background: '#fee2e2', fontSize: 12, color: '#dc2626' }}>
                ⚠️ Auto-checkout at 12 hours. Please check out soon!
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Check-In Card ─── */}
      {!checkedIn && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 28 }}>🕐</span>
            <div>
              <strong>Check In</strong>
              <p className="text-muted" style={{ margin: 0 }}>Face the camera to start your work session.</p>
            </div>
          </div>

          {!result && (
            <WebcamCapture
              onCapture={(f) => { setFile(f); setResult(null); setError(''); }}
              captureLabel="Capture for Check In"
            />
          )}

          {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}

          {result && result.action === 'check_in' && (
            <div style={{ marginTop: 12, background: '#f0fdf4', border: '2px solid #22c55e', borderRadius: 8, padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
              <h3 style={{ color: '#15803d', margin: '0 0 8px' }}>Checked In!</h3>
              {result.recognized_user && (
                <div style={{ fontSize: 14 }}>
                  <p><strong>Name:</strong> {result.recognized_user.user_name}</p>
                  <p><strong>Confidence:</strong> {(result.recognized_user.confidence * 100).toFixed(1)}%</p>
                  <p><strong>Time:</strong> {new Date(result.attendance_record?.timestamp).toLocaleTimeString()}</p>
                </div>
              )}
            </div>
          )}

          {file && !result && (
            <button className="btn btn-primary" onClick={handleCheckIn} disabled={loading} style={{ marginTop: 12 }}>
              {loading ? '⏳ Recognizing...' : '✅ Confirm & Check In'}
            </button>
          )}

          {result && (
            <button className="btn" onClick={handleReset} style={{ marginTop: 12 }}>
              🔄 Done
            </button>
          )}
        </div>
      )}

      {/* ─── Check-Out Card ─── */}
      {checkedIn && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 28 }}>🚪</span>
            <div>
              <strong>Check Out</strong>
              <p className="text-muted" style={{ margin: 0 }}>Face the camera to end your work session.</p>
            </div>
          </div>

          {!result && (
            <WebcamCapture
              onCapture={(f) => { setFile(f); setResult(null); setError(''); }}
              captureLabel="Capture for Check Out"
            />
          )}

          {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}

          {result && result.action === 'check_out' && (
            <div style={{ marginTop: 12, background: '#eff6ff', border: '2px solid #3b82f6', borderRadius: 8, padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>👋</div>
              <h3 style={{ color: '#1d4ed8', margin: '0 0 8px' }}>Checked Out!</h3>
              {result.attendance_record && (
                <div style={{ fontSize: 14 }}>
                  <p><strong>Session:</strong> {result.attendance_record.session_duration_hours?.toFixed(1)}h</p>
                  <p><strong>Regular:</strong> {result.attendance_record.regular_hours?.toFixed(1)}h</p>
                  {result.attendance_record.after_hours > 0 && (
                    <p><strong>After Hours:</strong>{' '}
                      <span style={{ color: '#d97706', fontWeight: 700 }}>
                        {result.attendance_record.after_hours?.toFixed(1)}h
                      </span>
                    </p>
                  )}
                  <p><strong>Check Out:</strong> {new Date(result.attendance_record.check_out).toLocaleTimeString()}</p>
                </div>
              )}
            </div>
          )}

          {file && !result && (
            <button className="btn" onClick={handleCheckOut} disabled={loading}
              style={{ marginTop: 12, background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 6, cursor: 'pointer' }}>
              {loading ? '⏳ Recognizing...' : '🚪 Confirm & Check Out'}
            </button>
          )}

          {result && result.action === 'check_out' && (
            <button className="btn" onClick={handleReset} style={{ marginTop: 12 }}>
              ✅ Done
            </button>
          )}
        </div>
      )}
    </div>
  );
}
