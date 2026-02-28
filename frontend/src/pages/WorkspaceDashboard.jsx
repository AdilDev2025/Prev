import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardApi, attendanceApi } from '../api/client';
import RegisterFace from '../components/attendance/RegisterFace';
import MarkAttendance from '../components/attendance/MarkAttendance';
import MembersList from '../components/workspace/MembersList';
import InviteModal from '../components/workspace/InviteModal';
import ProductivityReport from '../components/productivity/ProductivityReport';

export default function WorkspaceDashboard() {
  const { workspaceId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  async function loadWorkspace() {
    setLoading(true);
    setError('');
    try {
      const res = await dashboardApi.getWorkspaceDashboard(workspaceId);
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadWorkspace(); }, [workspaceId]);

  if (loading) return <div className="page-center">Loading workspace...</div>;
  if (error) return (
    <div className="page-center">
      <div className="alert alert-error">{error}</div>
      <button className="btn" onClick={() => navigate('/dashboard')}>← Back</button>
    </div>
  );

  const ws = data.workspace;
  const isAdmin = ws.user_role === 'admin';
  const faceRegistered = data.user.face_registered;

  const tabs = isAdmin
    ? ['overview', 'attendance', 'members', 'productivity']
    : ['overview', 'attendance', 'productivity'];

  return (
    <div className="container">
      {/* Header */}
      <div className="dash-header">
        <div>
          <button className="btn btn-sm" onClick={() => navigate('/dashboard')}>← Back</button>
          <h1 style={{ marginTop: 8 }}>{ws.name}</h1>
          <span className="badge">{ws.user_role.toUpperCase()}</span>
          {ws.owner && <span className="text-muted" style={{ marginLeft: 12 }}>Owner: {ws.owner.name}</span>}
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{data.stats.total_members}</div>
          <div className="stat-label">Members</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.stats.registered_faces}</div>
          <div className="stat-label">Faces Registered</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.stats.today_attendance_count ?? data.stats.recent_attendance_count}</div>
          <div className="stat-label">Today's Check-ins</div>
        </div>
        {!isAdmin && (
          <div className="stat-card">
            <div className="stat-value">{faceRegistered ? '✅' : '❌'}</div>
            <div className="stat-label">Your Face</div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <OverviewTab data={data} isAdmin={isAdmin} />
        )}
        {activeTab === 'attendance' && (
          <AttendanceTab
            workspaceId={workspaceId}
            faceRegistered={faceRegistered}
            isAdmin={isAdmin}
            data={data}
            onRefresh={loadWorkspace}
          />
        )}
        {activeTab === 'members' && isAdmin && (
          <MembersTab workspaceId={workspaceId} />
        )}
        {activeTab === 'productivity' && (
          <ProductivityTab
            workspaceId={workspaceId}
            userId={user.userId}
            isAdmin={isAdmin}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Overview Tab ─── */
function OverviewTab({ data, isAdmin }) {
  const todayAttendance = data.today_attendance || [];
  const recentAttendance = data.recent_attendance || [];
  const members = data.members || [];

  /* ─── ADMIN OVERVIEW ─── */
  if (isAdmin) {
    const presentMembers = members.filter(m => !m.attendance_exempt && m.present_today);
    const absentMembers = members.filter(m => !m.attendance_exempt && !m.present_today && m.face_registered);
    const unregisteredMembers = members.filter(m => !m.attendance_exempt && !m.face_registered);
    const employeeCount = members.filter(m => !m.attendance_exempt).length;

    return (
      <div>
        {/* Today's summary stats */}
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card" style={{ borderLeft: '4px solid #22c55e' }}>
            <div className="stat-value" style={{ color: '#22c55e' }}>{presentMembers.length}</div>
            <div className="stat-label">Present Today</div>
          </div>
          <div className="stat-card" style={{ borderLeft: '4px solid #ef4444' }}>
            <div className="stat-value" style={{ color: '#ef4444' }}>{absentMembers.length}</div>
            <div className="stat-label">Absent Today</div>
          </div>
          <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
            <div className="stat-value" style={{ color: '#f59e0b' }}>{unregisteredMembers.length}</div>
            <div className="stat-label">Face Not Registered</div>
          </div>
          <div className="stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
            <div className="stat-value">
              {employeeCount > 0 ? Math.round((presentMembers.length / employeeCount) * 100) : 0}%
            </div>
            <div className="stat-label">Attendance Rate</div>
          </div>
        </div>

        {/* Member Status Board */}
        <h3>👥 Members Status — {new Date().toLocaleDateString()}</h3>
        <table className="table" style={{ marginBottom: 24 }}>
          <thead>
            <tr>
              <th>Member</th>
              <th>Role</th>
              <th>Face Registered</th>
              <th>Today's Status</th>
              <th>Check-in Time</th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => {
              const checkin = todayAttendance.find(a => a.user_id === m.id);
              return (
                <tr key={m.id}>
                  <td>
                    <strong>{m.name}</strong>
                    <span className="text-muted" style={{ display: 'block', fontSize: 12 }}>{m.email}</span>
                  </td>
                  <td>
                    <span className="badge" style={{
                      background: m.role === 'admin' ? '#ede9fe' : '#e0f2fe',
                      color: m.role === 'admin' ? '#6d28d9' : '#0369a1'
                    }}>
                      {m.role}
                    </span>
                  </td>
                  <td>{m.face_registered ? '✅' : '❌'}</td>
                  <td>
                    {m.attendance_exempt ? (
                      <span className="badge" style={{ background: '#e0e7ff', color: '#4338ca' }}>EXEMPT</span>
                    ) : m.present_today ? (
                      <span className="badge badge-green">PRESENT</span>
                    ) : !m.face_registered ? (
                      <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>NOT ENROLLED</span>
                    ) : (
                      <span className="badge" style={{ background: '#fee2e2', color: '#dc2626' }}>ABSENT</span>
                    )}
                  </td>
                  <td>
                    {checkin
                      ? new Date(checkin.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Recent activity feed */}
        <h3>📋 Recent Activity</h3>
        {recentAttendance.length === 0 ? (
          <p className="text-muted">No attendance records yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Date & Time</th>
                <th>Confidence</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentAttendance.slice(0, 10).map(r => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.user_name}</strong>
                    {r.user_email && (
                      <span className="text-muted" style={{ display: 'block', fontSize: 12 }}>{r.user_email}</span>
                    )}
                  </td>
                  <td>{new Date(r.check_in).toLocaleString()}</td>
                  <td>
                    {r.confidence ? (
                      <span style={{
                        color: r.confidence > 0.8 ? '#22c55e' : r.confidence > 0.6 ? '#eab308' : '#ef4444',
                        fontWeight: 600
                      }}>
                        {(r.confidence * 100).toFixed(1)}%
                      </span>
                    ) : '—'}
                  </td>
                  <td><span className="badge badge-green">{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  /* ─── USER/EMPLOYEE OVERVIEW ─── */
  return (
    <div>
      <h3>Today's Attendance Summary</h3>
      {todayAttendance.length === 0 ? (
        <p className="text-muted">No one has checked in today.</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {todayAttendance.map(r => (
            <div key={r.id} style={{
              padding: '8px 14px', borderRadius: 6,
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 14
            }}>
              <span className="badge badge-green">{r.status}</span>
              <strong>{r.user_name}</strong>
              <span className="text-muted" style={{ fontSize: 12 }}>
                {new Date(r.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      )}

      <h3>Recent Activity</h3>
      {recentAttendance.length === 0 ? (
        <p className="text-muted">No attendance records yet.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Check In</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentAttendance.slice(0, 5).map(r => (
              <tr key={r.id}>
                <td>{r.user_name}</td>
                <td>{new Date(r.check_in).toLocaleString()}</td>
                <td><span className="badge badge-green">{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {data.actions_available?.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3>Quick Actions</h3>
          <div className="actions-bar">
            {data.actions_available.map(action => (
              <span key={action} className="badge">{action.replace('_', ' ')}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Attendance Tab ─── */
function AttendanceTab({ workspaceId, faceRegistered, isAdmin, data, onRefresh }) {
  const [facialStatus, setFacialStatus] = useState(null);
  const [checkingService, setCheckingService] = useState(true);

  useEffect(() => {
    // Only poll facial service for non-admin (they need it for register/mark)
    if (isAdmin) { setCheckingService(false); return; }
    let mounted = true;
    async function check() {
      try {
        const res = await attendanceApi.facialStatus();
        if (mounted) setFacialStatus(res);
      } catch {
        if (mounted) setFacialStatus({ status: 'offline' });
      } finally {
        if (mounted) setCheckingService(false);
      }
    }
    check();
    const interval = setInterval(check, 10000);
    return () => { mounted = false; clearInterval(interval); };
  }, [isAdmin]);

  const isOnline = facialStatus?.status === 'online';
  const qdrantConnected = facialStatus?.facial_api?.qdrant_connected;

  /* ─── ADMIN VIEW: Attendance Records Dashboard ─── */
  if (isAdmin) {
    const todayAttendance = data?.today_attendance || [];
    const recentAttendance = data?.recent_attendance || [];
    const members = data?.members || [];
    const employees = members.filter(m => !m.attendance_exempt);
    const employeeCount = employees.length;
    const presentToday = employees.filter(m => m.present_today).length;
    const absentToday = Math.max(0, employeeCount - presentToday);

    return (
      <div>
        {/* Today's Stats */}
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card" style={{ borderLeft: '4px solid #22c55e' }}>
            <div className="stat-value" style={{ color: '#22c55e' }}>{presentToday}</div>
            <div className="stat-label">Present Today</div>
          </div>
          <div className="stat-card" style={{ borderLeft: '4px solid #ef4444' }}>
            <div className="stat-value" style={{ color: '#ef4444' }}>{absentToday}</div>
            <div className="stat-label">Absent Today</div>
          </div>
          <div className="stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
            <div className="stat-value">{employeeCount}</div>
            <div className="stat-label">Employees</div>
          </div>
          <div className="stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
            <div className="stat-value">
              {employeeCount > 0 ? Math.round((presentToday / employeeCount) * 100) : 0}%
            </div>
            <div className="stat-label">Attendance Rate</div>
          </div>
        </div>

        {/* Today's Attendance */}
        <h3>📋 Today's Attendance — {new Date().toLocaleDateString()}</h3>
        {todayAttendance.length === 0 ? (
          <p className="text-muted">No check-ins today yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Duration</th>
                <th>After Hrs</th>
                <th>Confidence</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {todayAttendance.map(r => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.user_name}</strong>
                    {r.user_email && (
                      <span className="text-muted" style={{ display: 'block', fontSize: 12 }}>
                        {r.user_email}
                      </span>
                    )}
                  </td>
                  <td>{new Date(r.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>
                    {r.check_out
                      ? new Date(r.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : <span className="badge" style={{ background: '#dcfce7', color: '#15803d' }}>Active</span>
                    }
                  </td>
                  <td>
                    {r.session_duration != null
                      ? `${r.session_duration.toFixed(1)}h`
                      : r.check_out ? '—' : '⏱ In progress'
                    }
                  </td>
                  <td>
                    {r.is_after_hours ? (
                      <span style={{ color: '#d97706', fontWeight: 600 }}>
                        {r.session_duration != null ? `${Math.max(0, r.session_duration - 8).toFixed(1)}h` : 'Yes'}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    {r.confidence ? (
                      <span style={{
                        color: r.confidence > 0.8 ? '#22c55e' : r.confidence > 0.6 ? '#eab308' : '#ef4444',
                        fontWeight: 600
                      }}>
                        {(r.confidence * 100).toFixed(1)}%
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    {!r.check_out
                      ? <span className="badge badge-green">WORKING</span>
                      : <span className="badge badge-green">{r.status}</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Recent Attendance History */}
        <h3 style={{ marginTop: 24 }}>📊 Recent Attendance History</h3>
        {recentAttendance.length === 0 ? (
          <p className="text-muted">No attendance records yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Date</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Duration</th>
                <th>After Hrs</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentAttendance.map(r => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.user_name}</strong>
                    {r.user_email && (
                      <span className="text-muted" style={{ display: 'block', fontSize: 12 }}>
                        {r.user_email}
                      </span>
                    )}
                  </td>
                  <td>{new Date(r.check_in).toLocaleDateString()}</td>
                  <td>{new Date(r.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>
                    {r.check_out
                      ? new Date(r.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : <span className="badge" style={{ background: '#dcfce7', color: '#15803d' }}>Active</span>
                    }
                  </td>
                  <td>{r.session_duration != null ? `${r.session_duration.toFixed(1)}h` : '—'}</td>
                  <td>
                    {r.is_after_hours ? (
                      <span style={{ color: '#d97706', fontWeight: 600 }}>
                        {r.session_duration != null ? `${Math.max(0, r.session_duration - 8).toFixed(1)}h` : 'Yes'}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    {!r.check_out
                      ? <span className="badge badge-green">WORKING</span>
                      : <span className="badge badge-green">{r.status}</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <button className="btn" onClick={onRefresh} style={{ marginTop: 12 }}>
          🔄 Refresh Attendance
        </button>
      </div>
    );
  }

  /* ─── USER/EMPLOYEE VIEW: Face Register & Mark Attendance ─── */
  return (
    <div>
      {/* Service Status Banner */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap'
      }}>
        {/* Facial Service Status */}
        <div style={{
          flex: 1, minWidth: 200, padding: '14px 18px', borderRadius: 8,
          background: isOnline ? '#f0fdf4' : checkingService ? '#fffbeb' : '#fef2f2',
          border: `1px solid ${isOnline ? '#bbf7d0' : checkingService ? '#fde68a' : '#fecaca'}`,
          display: 'flex', alignItems: 'center', gap: 10
        }}>
          <span style={{ fontSize: 24 }}>
            {checkingService ? '⏳' : isOnline ? '🟢' : '🔴'}
          </span>
          <div>
            <strong style={{ color: isOnline ? '#15803d' : checkingService ? '#92400e' : '#dc2626' }}>
              {checkingService ? 'Checking Facial AI Service...' :
               isOnline ? 'Facial AI Service Online' : 'Facial AI Service Offline'}
            </strong>
            <p className="text-muted" style={{ margin: 0, fontSize: 12 }}>
              {checkingService ? 'Please wait...' :
               isOnline
                 ? (qdrantConnected ? 'Qdrant vector DB connected ✓' : '⚠️ Qdrant not connected – enroll will fail')
                 : 'Service is starting up. It auto-starts with the backend.'}
            </p>
          </div>
        </div>

        {/* Face Registration Status */}
        <div style={{
          flex: 1, minWidth: 200, padding: '14px 18px', borderRadius: 8,
          background: faceRegistered ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${faceRegistered ? '#bbf7d0' : '#fecaca'}`,
          display: 'flex', alignItems: 'center', gap: 10
        }}>
          <span style={{ fontSize: 24 }}>{faceRegistered ? '✅' : '❌'}</span>
          <div>
            <strong style={{ color: faceRegistered ? '#15803d' : '#dc2626' }}>
              {faceRegistered ? 'Face Registered' : 'Face Not Registered'}
            </strong>
            <p className="text-muted" style={{ margin: 0, fontSize: 12 }}>
              {faceRegistered ? 'Your face is enrolled in the AI system' : 'Step 1: Register your face to use attendance'}
            </p>
          </div>
        </div>
      </div>

      {/* Step 1: Register (only if not registered) */}
      {!faceRegistered && (
        <div style={{ marginBottom: 20 }}>
          <h3>📸 Step 1: Register Your Face</h3>
          <p className="text-muted">Use your camera to register your face with the AI recognition system.</p>
          {!isOnline && !checkingService && (
            <div className="alert alert-error" style={{ marginBottom: 12 }}>
              ⚠️ Facial AI service is offline. Registration will fail. The service auto-starts with the Node.js backend — please wait or check backend logs.
            </div>
          )}
          <RegisterFace workspaceId={workspaceId} onSuccess={onRefresh} />
        </div>
      )}

      {/* Step 2: Mark Attendance (only if registered) */}
      {faceRegistered && (
        <div>
          <h3>🕐 Mark Attendance</h3>
          <p className="text-muted">Face the camera to check in. Your identity will be verified by AI.</p>
          {!isOnline && !checkingService && (
            <div className="alert alert-error" style={{ marginBottom: 12 }}>
              ⚠️ Facial AI service is offline. Attendance marking will fail until it comes online.
            </div>
          )}
          <MarkAttendance workspaceId={workspaceId} />
        </div>
      )}
    </div>
  );
}

/* ─── Members Tab (Admin Only) ─── */
function MembersTab({ workspaceId }) {
  const [showInvite, setShowInvite] = useState(false);

  return (
    <div>
      <div className="actions-bar">
        <h3>Workspace Members</h3>
        <button className="btn btn-primary" onClick={() => setShowInvite(!showInvite)}>
          {showInvite ? 'Close' : '+ Invite Member'}
        </button>
      </div>
      {showInvite && (
        <InviteModal workspaceId={workspaceId} onClose={() => setShowInvite(false)} />
      )}
      <MembersList workspaceId={workspaceId} />
    </div>
  );
}

/* ─── Productivity Tab ─── */
function ProductivityTab({ workspaceId, userId, isAdmin }) {
  return (
    <ProductivityReport
      workspaceId={workspaceId}
      userId={userId}
      isAdmin={isAdmin}
    />
  );
}




