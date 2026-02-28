import { useState, useEffect, useRef } from 'react';
import { productivityApi } from '../../api/client';

export default function ProductivityReport({ workspaceId, userId, isAdmin }) {
  const [snapshots, setSnapshots] = useState([]);
  const [allSnapshots, setAllSnapshots] = useState([]);  // admin: all members
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Live hours
  const [liveHours, setLiveHours] = useState(null);
  const [workspaceLive, setWorkspaceLive] = useState([]);
  const liveTimerRef = useRef(null);

  // Toggle: admin can view own vs all
  const [viewMode, setViewMode] = useState(isAdmin ? 'all' : 'mine');

  // Generate snapshot form
  const [genLoading, setGenLoading] = useState(false);
  const [genMsg, setGenMsg] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Admin generate-all
  const [genAllLoading, setGenAllLoading] = useState(false);
  const [genAllMsg, setGenAllMsg] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const promises = [
        productivityApi.getSnapshots(userId, workspaceId),
        productivityApi.getLatest(userId, workspaceId),
        productivityApi.getLiveHours(userId, workspaceId),
      ];

      // Admin: also load all workspace snapshots + live hours
      if (isAdmin) {
        promises.push(productivityApi.getWorkspaceSnapshots(workspaceId));
        promises.push(productivityApi.getWorkspaceLiveHours(workspaceId));
      }

      const results = await Promise.allSettled(promises);

      // Own snapshots
      if (results[0].status === 'fulfilled') {
        setSnapshots(results[0].value.data || []);
      } else if (results[0].reason?.status !== 404) {
        setError(results[0].reason?.message || 'Failed to load snapshots');
      }

      // Latest own
      if (results[1].status === 'fulfilled') {
        setLatest(results[1].value.data || null);
      }

      // Live hours (own)
      if (results[2].status === 'fulfilled') {
        setLiveHours(results[2].value.data || null);
      }

      // All workspace snapshots (admin)
      if (isAdmin && results[3]) {
        if (results[3].status === 'fulfilled') {
          setAllSnapshots(results[3].value.data || []);
        }
      }

      // Workspace live hours (admin)
      if (isAdmin && results[4]) {
        if (results[4].status === 'fulfilled') {
          setWorkspaceLive(results[4].value.data || []);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [userId, workspaceId]);

  // Poll live hours every 30 seconds
  useEffect(() => {
    async function refreshLive() {
      try {
        const res = await productivityApi.getLiveHours(userId, workspaceId);
        setLiveHours(res.data || null);
        if (isAdmin) {
          const wres = await productivityApi.getWorkspaceLiveHours(workspaceId);
          setWorkspaceLive(wres.data || []);
        }
      } catch { /* silent */ }
    }
    liveTimerRef.current = setInterval(refreshLive, 30000);
    return () => clearInterval(liveTimerRef.current);
  }, [userId, workspaceId, isAdmin]);

  async function handleGenerate(e) {
    e.preventDefault();
    setGenLoading(true);
    setGenMsg('');
    try {
      await productivityApi.createSnapshot(userId, workspaceId, new Date(startDate).toISOString(), new Date(endDate).toISOString());
      setGenMsg('✅ Snapshot generated!');
      loadData();
    } catch (err) {
      setGenMsg(`❌ ${err.message}`);
    } finally {
      setGenLoading(false);
    }
  }

  async function handleGenerateAll() {
    setGenAllLoading(true);
    setGenAllMsg('');
    try {
      const res = await productivityApi.generateAll(workspaceId, new Date(startDate).toISOString(), new Date(endDate).toISOString());
      setGenAllMsg(`✅ ${res.message} (${res.generated} generated, ${res.noData} no data)`);
      loadData();
    } catch (err) {
      setGenAllMsg(`❌ ${err.message}`);
    } finally {
      setGenAllLoading(false);
    }
  }

  function fmt(val, decimals = 1) {
    return (val != null && !isNaN(val)) ? Number(val).toFixed(decimals) : '—';
  }

  function fmtPct(val) {
    return (val != null && !isNaN(val)) ? (Number(val) * 100).toFixed(1) + '%' : '—';
  }

  function scoreColor(score) {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#eab308';
    return '#ef4444';
  }

  return (
    <div>
      {/* Latest Score */}
      <h3>Your Productivity Score</h3>
      {latest ? (
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card" style={{ borderLeft: `4px solid ${scoreColor(latest.finalScore)}` }}>
            <div className="stat-value" style={{ color: scoreColor(latest.finalScore) }}>
              {fmt(latest.finalScore)}
            </div>
            <div className="stat-label">Final Score /100</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{fmt(latest.totalHours)}h</div>
            <div className="stat-label">Total Hours</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{fmtPct(latest.avgConfidence)}</div>
            <div className="stat-label">Avg Confidence</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{fmtPct(latest.attendanceScore)}</div>
            <div className="stat-label">Attendance Score</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{fmtPct(latest.reliabilityScore)}</div>
            <div className="stat-label">Reliability Score</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{fmt(latest.afterHours)}h</div>
            <div className="stat-label">After Hours</div>
          </div>
        </div>
      ) : (
        <p className="text-muted">No productivity data yet. Generate a snapshot below.</p>
      )}

      {/* ─── Live Hours (Employee) ─── */}
      {!isAdmin && liveHours && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>⏱ Live Hours — {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{liveHours.today?.total_hours?.toFixed(1) || '0.0'}h</div>
              <div className="stat-label">Today</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{liveHours.month?.total_hours?.toFixed(1) || '0.0'}h</div>
              <div className="stat-label">This Month</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{liveHours.month?.after_hours?.toFixed(1) || '0.0'}h</div>
              <div className="stat-label">After Hours</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{liveHours.month?.sessions_count || 0}</div>
              <div className="stat-label">Sessions</div>
            </div>
          </div>
          {liveHours.active_session && (
            <div style={{
              marginTop: 12, padding: '10px 14px', borderRadius: 6,
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              <span style={{ fontSize: 18 }}>🟢</span>
              <div>
                <strong>Active since {new Date(liveHours.active_session.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                <span className="text-muted" style={{ marginLeft: 8, fontSize: 13 }}>
                  {liveHours.active_session.elapsed_hours?.toFixed(1)}h elapsed
                  {liveHours.active_session.after_hours > 0 && (
                    <span style={{ color: '#d97706', fontWeight: 600 }}> ({liveHours.active_session.after_hours.toFixed(1)}h after-hours)</span>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Live Hours Table (Admin) ─── */}
      {isAdmin && workspaceLive.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>⏱ Employee Live Hours — {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Status</th>
                <th>Today</th>
                <th>This Month</th>
                <th>After Hours</th>
                <th>Sessions</th>
              </tr>
            </thead>
            <tbody>
              {workspaceLive.map(emp => (
                <tr key={emp.user_id}>
                  <td>
                    <strong>{emp.name}</strong>
                    <span className="text-muted" style={{ display: 'block', fontSize: 12 }}>{emp.email}</span>
                  </td>
                  <td>
                    {emp.is_active ? (
                      <span className="badge badge-green">
                        🟢 Active since {new Date(emp.active_since).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : (
                      <span className="badge" style={{ background: '#f3f4f6', color: '#6b7280' }}>Offline</span>
                    )}
                  </td>
                  <td style={{ fontWeight: 600 }}>{emp.today_hours.toFixed(1)}h</td>
                  <td style={{ fontWeight: 600 }}>{emp.month_hours.toFixed(1)}h</td>
                  <td>
                    {emp.month_after_hours > 0 ? (
                      <span style={{ color: '#d97706', fontWeight: 600 }}>{emp.month_after_hours.toFixed(1)}h</span>
                    ) : '—'}
                  </td>
                  <td>{emp.sessions_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Generate Snapshot */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Generate Snapshot</h3>
        {genMsg && <div className="alert">{genMsg}</div>}
        <form onSubmit={handleGenerate} className="inline-form" style={{ flexWrap: 'wrap', gap: 8 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Start</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>End</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={genLoading} style={{ alignSelf: 'flex-end' }}>
            {genLoading ? 'Generating...' : 'Generate My Snapshot'}
          </button>
        </form>
      </div>

      {/* Admin: Generate for all workspace members */}
      {isAdmin && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>Admin: Generate All Snapshots</h3>
          <p className="text-muted">Generate productivity snapshots for every member in this workspace.</p>
          {genAllMsg && <div className="alert">{genAllMsg}</div>}
          <button
            className="btn btn-primary"
            onClick={handleGenerateAll}
            disabled={genAllLoading}
          >
            {genAllLoading ? 'Generating...' : 'Generate All Member Snapshots'}
          </button>
        </div>
      )}

      {/* History */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>Snapshot History</h3>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className={`btn btn-sm ${viewMode === 'all' ? 'btn-primary' : ''}`}
              onClick={() => setViewMode('all')}
              style={{ fontSize: 13, padding: '4px 12px' }}
            >
              All Members
            </button>
            <button
              className={`btn btn-sm ${viewMode === 'mine' ? 'btn-primary' : ''}`}
              onClick={() => setViewMode('mine')}
              style={{ fontSize: 13, padding: '4px 12px' }}
            >
              Mine Only
            </button>
          </div>
        )}
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <div className="alert alert-error">{error}</div>
      ) : (() => {
        const displayData = (isAdmin && viewMode === 'all') ? allSnapshots : snapshots;
        const showMemberCol = isAdmin && viewMode === 'all';
        return displayData.length === 0 ? (
          <p className="text-muted">
            {showMemberCol
              ? 'No member snapshots yet. Use "Generate All Member Snapshots" above.'
              : 'No snapshots yet.'}
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                {showMemberCol && <th>Member</th>}
                <th>Period</th>
                <th>Final Score</th>
                <th>Hours</th>
                <th>After Hrs</th>
                <th>Confidence</th>
                <th>Attendance</th>
                <th>Reliability</th>
                <th>Generated</th>
              </tr>
            </thead>
            <tbody>
              {displayData.map(s => (
                <tr key={s.id}>
                  {showMemberCol && (
                    <td style={{ fontWeight: 500 }}>
                      {s.user?.name || `User #${s.userId}`}
                    </td>
                  )}
                  <td>{new Date(s.periodStart).toLocaleDateString()} – {new Date(s.periodEnd).toLocaleDateString()}</td>
                  <td style={{ color: scoreColor(s.finalScore), fontWeight: 700 }}>{fmt(s.finalScore)}</td>
                  <td>{fmt(s.totalHours)}h</td>
                  <td>
                    {s.afterHours > 0 ? (
                      <span style={{ color: '#d97706', fontWeight: 600 }}>{fmt(s.afterHours)}h</span>
                    ) : '—'}
                  </td>
                  <td>{fmtPct(s.avgConfidence)}</td>
                  <td>{fmtPct(s.attendanceScore)}</td>
                  <td>{fmtPct(s.reliabilityScore)}</td>
                  <td>{new Date(s.generatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      })()}
    </div>
  );
}

