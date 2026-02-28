import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardApi, workspaceApi, inviteApi } from '../api/client';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create workspace
  const [showCreate, setShowCreate] = useState(false);
  const [wsName, setWsName] = useState('');
  const [creating, setCreating] = useState(false);

  // Accept invite
  const [inviteId, setInviteId] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');

  async function loadDashboard() {
    setLoading(true);
    setError('');
    try {
      const data = await dashboardApi.getUserDashboard();
      setDashData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDashboard(); }, []);

  async function handleCreateWorkspace(e) {
    e.preventDefault();
    setCreating(true);
    try {
      await workspaceApi.create(wsName);
      setWsName('');
      setShowCreate(false);
      loadDashboard();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleAcceptInvite(e) {
    e.preventDefault();
    setAccepting(true);
    setInviteMsg('');
    try {
      const data = await inviteApi.accept(inviteId.trim());
      setInviteMsg(`✅ ${data.message}`);
      setInviteId('');
      loadDashboard();
    } catch (err) {
      setInviteMsg(`❌ ${err.message}`);
    } finally {
      setAccepting(false);
    }
  }

  if (loading) return <div className="page-center">Loading dashboard...</div>;
  if (error && !dashData) return <div className="page-center"><div className="alert alert-error">{error}</div></div>;

  const dashRole = dashData?.user?.role || 'user';
  const workspaces = dashData?.workspaces || [];
  const stats = dashData?.stats;

  return (
    <div className="container">
      <div className="dash-header">
        <div>
          <h1>Welcome, {user?.name}</h1>
          <span className="badge">{dashRole.toUpperCase()}</span>
        </div>
      </div>

      {/* Stats for Admin */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.totalWorkspaces}</div>
            <div className="stat-label">Workspaces</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.totalMembers}</div>
            <div className="stat-label">Total Members</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.pendingInvites}</div>
            <div className="stat-label">Pending Invites</div>
          </div>
        </div>
      )}

      {/* Actions bar */}
      <div className="actions-bar">
        <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
          + Create Workspace
        </button>
      </div>

      {/* Create workspace form */}
      {showCreate && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>Create Workspace</h3>
          <form onSubmit={handleCreateWorkspace} className="inline-form">
            <input
              type="text"
              placeholder="Workspace name"
              value={wsName}
              onChange={e => setWsName(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button type="button" className="btn" onClick={() => setShowCreate(false)}>Cancel</button>
          </form>
        </div>
      )}

      {/* Accept invite section */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Join a Workspace</h3>
        <p className="text-muted">Paste the invite ID you received</p>
        {inviteMsg && <div className="alert" style={{ marginBottom: 8 }}>{inviteMsg}</div>}
        <form onSubmit={handleAcceptInvite} className="inline-form">
          <input
            type="text"
            placeholder="Invite ID (UUID)"
            value={inviteId}
            onChange={e => setInviteId(e.target.value)}
            required
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary" disabled={accepting}>
            {accepting ? 'Joining...' : 'Accept Invite'}
          </button>
        </form>
      </div>

      {/* Workspaces list */}
      <h2>Your Workspaces</h2>
      {workspaces.length === 0 ? (
        <div className="card">
          <p className="text-muted">No workspaces yet. Create one or join via invite!</p>
        </div>
      ) : (
        <div className="ws-grid">
          {workspaces.map(ws => (
            <div
              key={ws.id}
              className="card ws-card"
              onClick={() => navigate(`/workspace/${ws.id}`)}
            >
              <h3>{ws.name}</h3>
              <p className="text-muted">ID: {ws.id}</p>
              {ws.WorkspaceMember && (
                <p>{ws.WorkspaceMember.length} members</p>
              )}
              {ws.owner && (
                <p className="text-muted">Owner: {ws.owner.name}</p>
              )}
              <span className="badge">Open →</span>
            </div>
          ))}
        </div>
      )}

      {/* New user message */}
      {dashData?.message && (
        <div className="card" style={{ marginTop: 16 }}>
          <p>{dashData.message}</p>
        </div>
      )}
    </div>
  );
}

