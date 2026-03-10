import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { dashboardApi, workspaceApi } from '../api/client';
import Sidebar from '../components/Sidebar';
import InviteModal from '../components/workspace/InviteModal';
import MembersList from '../components/workspace/MembersList';
import RegisterFace from '../components/attendance/RegisterFace';
import MarkAttendance from '../components/attendance/MarkAttendance';
import ProductivityReport from '../components/productivity/ProductivityReport';

import { motion, AnimatePresence } from 'framer-motion';

import {
  MdPeople, MdFace, MdCheckCircle, MdHistory, MdBusiness,
  MdEdit, MdCheck, MdClose, MdMail, MdMenu, MdLightMode,
  MdDarkMode, MdDashboard, MdAccessTime, MdTrendingUp,
  MdAdminPanelSettings, MdWarning, MdVerified, MdSchedule,
  MdBarChart, MdSecurity, MdGroup, MdPerson,
} from 'react-icons/md';

import {
  Chip, Avatar, LinearProgress, Tooltip, Badge,
  Skeleton, Alert,
} from '@mui/material';

// ─── Animation variants ───────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  }),
};


// ─── Stat card ────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, value, label, color, delay }) {
  return (
    <motion.div
      custom={delay} variants={fadeUp} initial="hidden" animate="visible"
      whileHover={{ scale: 1.012, boxShadow: "0 8px 32px rgba(79,142,247,.18)", transition: { duration: 0.22 } }}
      style={{
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '20px 22px',
        display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 140,
      }}
    >
      <div style={{
        width: 46, height: 46, borderRadius: 13, flexShrink: 0,
        background: `${color}18`, border: `1px solid ${color}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 26, fontWeight: 900, color: 'var(--txt)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--txt-4)', marginTop: 4, fontWeight: 600, letterSpacing: .4, textTransform: 'uppercase' }}>{label}</div>
      </div>
    </motion.div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, color = 'var(--accent)', action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9, background: `${color}18`,
          border: `1px solid ${color}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} color={color} />
        </div>
        <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--txt)' }}>{title}</span>
      </div>
      {action}
    </div>
  );
}

// ─── Role chip ────────────────────────────────────────────────────────────
function RoleChip({ role }) {
  const map = {
    admin: { color: '#4F8EF7', bg: '#4F8EF714', label: 'Admin' },
    owner: { color: '#A855F7', bg: '#A855F714', label: 'Owner' },
    employee: { color: '#22C55E', bg: '#22C55E14', label: 'Employee' },
  };
  const c = map[role] || map.employee;
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
      background: c.bg, color: c.color, border: `1px solid ${c.color}33`,
      letterSpacing: .4, textTransform: 'uppercase',
    }}>{c.label}</span>
  );
}

// ─── Status pill ──────────────────────────────────────────────────────────
function StatusPill({ present, exempt }) {
  if (exempt) return <Chip label="Exempt" size="small" sx={{ bgcolor: '#A855F714', color: '#A855F7', fontWeight: 700, fontSize: 11, height: 22 }} />;
  if (present) return <Chip label="Present" size="small" sx={{ bgcolor: '#22C55E14', color: '#22C55E', fontWeight: 700, fontSize: 11, height: 22 }} />;
  return <Chip label="Absent" size="small" sx={{ bgcolor: '#EF444414', color: '#EF4444', fontWeight: 700, fontSize: 11, height: 22 }} />;
}

// ─── Main ─────────────────────────────────────────────────────────────────
export default function WorkspaceDashboard() {
  const { id: workspaceId } = useParams();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [tab, setTab]           = useState('overview');
  const [sideOpen, setSideOpen] = useState(false);
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [err, setErr]           = useState('');
  const [showInvite, setShowInvite] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving]     = useState(false);

  useEffect(() => { loadData(); }, [workspaceId]);

  async function loadData() {
    setLoading(true); setErr('');
    try {
      const d = await dashboardApi.getWorkspace(workspaceId);
      setData(d);
      setEditName(d.workspace?.name || '');
    } catch (e) { setErr(e.message || 'Failed to load workspace'); }
    finally { setLoading(false); }
  }

  async function handleSaveName() {
    setSaving(true);
    try {
      await workspaceApi.update(workspaceId, editName.trim());
      setEditMode(false); await loadData();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  }

  // ── Loading skeleton ──────────────────────────────────────────────────
  if (loading) return (
    <div className="shell">
      <div className="main" style={{ padding: 32 }}>
        <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 2, mb: 2, bgcolor: 'var(--bg-2)' }} />
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          {[1,2,3,4].map(i => <Skeleton key={i} variant="rectangular" height={88} sx={{ flex: 1, borderRadius: 2, bgcolor: 'var(--bg-2)' }} />)}
        </div>
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2, bgcolor: 'var(--bg-2)' }} />
      </div>
    </div>
  );

  if (err) return (
    <div className="shell">
      <div className="page-center" style={{ width: '100%' }}>
        <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>
        <button className="btn" onClick={() => navigate('/dashboard')}>← Back</button>
      </div>
    </div>
  );

  const ws               = data?.workspace;
  const stats            = data?.stats;
  const members          = data?.members || [];
  const todayAttendance  = data?.today_attendance || [];
  const recentAttendance = data?.recent_attendance || [];
  const userInfo         = data?.user;
  const isAdmin          = ws?.user_role === 'admin' || ws?.user_role === 'owner';

  return (
    <div className="shell">
      <Sidebar
        isWorkspace workspaceName={ws?.name}
        activeTab={tab} onTabChange={setTab}
        isAdmin={isAdmin} isOpen={sideOpen}
        onClose={() => setSideOpen(false)}
      />

      <div className="main">
        {/* ── Topbar ── */}
        <header className="topbar" style={{ borderBottom: '1px solid var(--border)', backdropFilter: 'blur(12px)' }}>
          <div className="topbar-l">
            <button className="menu-btn" onClick={() => setSideOpen(o => !o)}>
              <MdMenu size={22} />
            </button>

            {editMode ? (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  value={editName} onChange={e => setEditName(e.target.value)}
                  style={{
                    padding: '6px 12px', border: '1px solid var(--accent)', borderRadius: 8,
                    background: 'var(--bg-3)', color: 'var(--txt)', fontSize: 14,
                    fontFamily: 'Outfit, sans-serif', outline: 'none',
                  }}
                  autoFocus
                />
                <button className="btn btn-xs btn-p" onClick={handleSaveName} disabled={saving}>
                  {saving ? '...' : <MdCheck size={14} />}
                </button>
                <button className="btn btn-xs" onClick={() => setEditMode(false)}>
                  <MdClose size={14} />
                </button>
              </motion.div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="topbar-title">{ws?.name}</span>
                <RoleChip role={ws?.user_role} />
                {isAdmin && (
                  <Tooltip title="Rename workspace">
                    <button className="btn btn-xs" onClick={() => setEditMode(true)} style={{ padding: '4px 6px' }}>
                      <MdEdit size={13} />
                    </button>
                  </Tooltip>
                )}
              </div>
            )}
          </div>

          <div className="topbar-r">
            <Tooltip title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
              <button className="theme-btn" onClick={toggleTheme}>
                {theme === 'dark' ? <MdLightMode size={18} /> : <MdDarkMode size={18} />}
              </button>
            </Tooltip>
            {isAdmin && (
              <button className="btn btn-sm btn-p" onClick={() => setShowInvite(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MdMail size={15} /> Invite
              </button>
            )}
          </div>
        </header>

        <div className="page fade">

          {/* ── Stats row — admin only ── */}
          {isAdmin && (
            <motion.div
              initial="hidden" animate="visible"
              style={{ display: 'flex', gap: 14, marginBottom: 28, flexWrap: 'wrap' }}
            >
              <StatCard icon={MdPeople}    value={stats?.total_members ?? 0}           label="Members"       color="#4F8EF7" delay={0} />
              <StatCard icon={MdFace}      value={stats?.registered_faces ?? 0}        label="Faces Reg."    color="#A855F7" delay={1} />
              <StatCard icon={MdCheckCircle} value={stats?.today_attendance_count ?? 0} label="Today"       color="#22C55E" delay={2} />
              <StatCard icon={MdHistory}   value={stats?.recent_attendance_count ?? 0} label="Recent"        color="#F59E0B" delay={3} />
            </motion.div>
          )}

          {/* ══════════════════════════════
              OVERVIEW TAB
          ══════════════════════════════ */}
          <AnimatePresence mode="wait">
          {tab === 'overview' && (
            <motion.div key="overview"
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>

              {/* Workspace Info — ADMIN ONLY */}
              {isAdmin && (
                <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible"
                  className="card" style={{ marginBottom: 20 }}>
                  <SectionHeader icon={MdBusiness} title="Workspace Info" color="#4F8EF7" />
                  <div style={{ display: 'grid', gap: 10 }}>
                    {[
                      ['Name',     ws?.name],
                      ['Owner',    `${ws?.owner?.name} — ${ws?.owner?.email}`],
                      ['Your Role', ws?.user_role],
                      ['Created',  new Date(ws?.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })],
                    ].map(([k, v]) => (
                      <div key={k} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13,
                      }}>
                        <span style={{ color: 'var(--txt-4)', fontWeight: 600 }}>{k}</span>
                        <strong style={{ color: 'var(--txt-2)' }}>{v}</strong>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Today's Attendance — ADMIN ONLY */}
              {isAdmin && (
                <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible"
                  className="card" style={{ marginBottom: 20 }}>
                  <SectionHeader icon={MdSchedule} title={`Today's Attendance (${todayAttendance.length})`} color="#22C55E" />
                  {todayAttendance.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--txt-4)' }}>
                      <MdAccessTime size={32} style={{ marginBottom: 8, opacity: .4 }} />
                      <p style={{ margin: 0, fontSize: 13 }}>No check-ins today yet.</p>
                    </div>
                  ) : (
                    <div className="tbl-wrap">
                      <table className="tbl">
                        <thead><tr><th>Member</th><th>Status</th><th>Check In</th><th>Duration</th></tr></thead>
                        <tbody>
                          {todayAttendance.map((a, i) => (
                            <motion.tr key={a.id} custom={i} variants={fadeUp} initial="hidden" animate="visible">
                              <td><strong>{a.user?.name || '—'}</strong></td>
                              <td>
                                <Chip label={a.status} size="small" sx={{
                                  bgcolor: a.status === 'PRESENT' ? '#22C55E14' : '#F59E0B14',
                                  color:   a.status === 'PRESENT' ? '#22C55E'   : '#F59E0B',
                                  fontWeight: 700, fontSize: 10, height: 20,
                                }} />
                              </td>
                              <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                                {new Date(a.timestamp).toLocaleTimeString()}
                              </td>
                              <td>{a.session_duration_hours ? `${a.session_duration_hours.toFixed(1)}h` : '—'}</td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Member Status — ADMIN ONLY */}
              {isAdmin && (
                <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible"
                  className="card" style={{ marginBottom: 20 }}>
                  <SectionHeader icon={MdGroup} title="Member Status" color="#A855F7" />
                  <div style={{ display: 'grid', gap: 10 }}>
                    {members.map((m, i) => (
                      <motion.div key={m.id} custom={i} variants={fadeUp} initial="hidden" animate="visible"
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '10px 0', borderBottom: '1px solid var(--border)',
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Avatar sx={{
                            width: 34, height: 34, fontSize: 13, fontWeight: 800,
                            background: 'linear-gradient(135deg, var(--accent), #6D44F8)',
                          }}>
                            {m.name?.[0]?.toUpperCase()}
                          </Avatar>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--txt)' }}>{m.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--txt-4)' }}>{m.email}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <Tooltip title={m.face_registered ? 'Face registered' : 'No face registered'}>
                            <Chip
                              icon={<MdFace size={12} />}
                              label={m.face_registered ? 'Face ✓' : 'No Face'}
                              size="small"
                              sx={{
                                bgcolor: m.face_registered ? '#22C55E14' : '#F59E0B14',
                                color:   m.face_registered ? '#22C55E'   : '#F59E0B',
                                fontWeight: 700, fontSize: 10, height: 22,
                              }}
                            />
                          </Tooltip>
                          <StatusPill present={m.present_today} exempt={m.attendance_exempt} />
                          <RoleChip role={m.role} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Recent Activity — ADMIN ONLY */}
              {isAdmin && recentAttendance.length > 0 && (
                <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible"
                  className="card">
                  <SectionHeader icon={MdHistory} title="Recent Activity" color="#F59E0B" />
                  <div className="tbl-wrap">
                    <table className="tbl">
                      <thead><tr><th>User</th><th>Action</th><th>Time</th></tr></thead>
                      <tbody>
                        {recentAttendance.slice(0, 10).map((a, i) => (
                          <motion.tr key={a.id} custom={i} variants={fadeUp} initial="hidden" animate="visible">
                            <td><strong>{a.user?.name || '—'}</strong></td>
                            <td>
                              <Chip label={a.status} size="small" sx={{
                                bgcolor: a.status === 'PRESENT' ? '#22C55E14' : '#4F8EF714',
                                color:   a.status === 'PRESENT' ? '#22C55E'   : '#4F8EF7',
                                fontWeight: 700, fontSize: 10, height: 20,
                              }} />
                            </td>
                            <td style={{ fontSize: 12, color: 'var(--txt-4)' }}>
                              {new Date(a.timestamp).toLocaleString()}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* Employee: simple welcome prompt */}
              {!isAdmin && (
                <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible"
                  className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
                  <MdAccessTime size={40} color="var(--accent)" style={{ marginBottom: 12 }} />
                  <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--txt)', marginBottom: 6 }}>
                    Ready to check in?
                  </div>
                  <div className="txt-muted" style={{ fontSize: 13, marginBottom: 20 }}>
                    Head to the Attendance tab to start your session.
                  </div>
                  <button className="btn btn-p" onClick={() => setTab('attendance')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <MdCheckCircle size={16} /> Go to Attendance
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ══════════════════════════════
              ATTENDANCE TAB
          ══════════════════════════════ */}
          {tab === 'attendance' && (
            <motion.div key="attendance"
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>

              {isAdmin ? (
                /* ── Admin: full attendance tables ── */
                <div>
                  <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible"
                    className="card" style={{ marginBottom: 20 }}>
                    <SectionHeader icon={MdSchedule} title={`Today's Check-ins (${todayAttendance.length})`} color="#22C55E" />
                    {todayAttendance.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--txt-4)' }}>
                        <MdAccessTime size={32} style={{ marginBottom: 8, opacity: .4 }} />
                        <p style={{ margin: 0, fontSize: 13 }}>No check-ins recorded today.</p>
                      </div>
                    ) : (
                      <div className="tbl-wrap">
                        <table className="tbl">
                          <thead>
                            <tr><th>Employee</th><th>Status</th><th>Check In</th><th>Check Out</th><th>Duration</th><th>After Hrs</th><th>Confidence</th></tr>
                          </thead>
                          <tbody>
                            {todayAttendance.map((a, i) => (
                              <motion.tr key={a.id} custom={i} variants={fadeUp} initial="hidden" animate="visible">
                                <td><strong>{a.user?.name || '—'}</strong></td>
                                <td>
                                  <Chip label={a.status} size="small" sx={{
                                    bgcolor: a.status === 'PRESENT' ? '#22C55E14' : '#F59E0B14',
                                    color:   a.status === 'PRESENT' ? '#22C55E'   : '#F59E0B',
                                    fontWeight: 700, fontSize: 10, height: 20,
                                  }} />
                                </td>
                                <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                                  {new Date(a.timestamp || a.check_in).toLocaleTimeString()}
                                </td>
                                <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                                  {a.check_out ? new Date(a.check_out).toLocaleTimeString() : '—'}
                                </td>
                                <td>{a.session_duration_hours ? `${a.session_duration_hours.toFixed(1)}h` : '—'}</td>
                                <td>
                                  {a.after_hours > 0
                                    ? <span style={{ color: '#F59E0B', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{a.after_hours.toFixed(1)}h</span>
                                    : '—'}
                                </td>
                                <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                                  {a.confidence ? `${(a.confidence * 100).toFixed(1)}%` : '—'}
                                </td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </motion.div>

                  {recentAttendance.length > 0 && (
                    <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible"
                      className="card">
                      <SectionHeader icon={MdHistory} title="Recent History" color="#F59E0B" />
                      <div className="tbl-wrap">
                        <table className="tbl">
                          <thead><tr><th>Employee</th><th>Status</th><th>Time</th><th>Duration</th></tr></thead>
                          <tbody>
                            {recentAttendance.map((a, i) => (
                              <motion.tr key={a.id} custom={i} variants={fadeUp} initial="hidden" animate="visible">
                                <td><strong>{a.user?.name || '—'}</strong></td>
                                <td>
                                  <Chip label={a.status} size="small" sx={{
                                    bgcolor: a.status === 'PRESENT' ? '#22C55E14' : '#4F8EF714',
                                    color:   a.status === 'PRESENT' ? '#22C55E'   : '#4F8EF7',
                                    fontWeight: 700, fontSize: 10, height: 20,
                                  }} />
                                </td>
                                <td style={{ fontSize: 12, color: 'var(--txt-4)' }}>
                                  {new Date(a.timestamp).toLocaleString()}
                                </td>
                                <td>{a.session_duration_hours ? `${a.session_duration_hours.toFixed(1)}h` : '—'}</td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </div>
              ) : (
                /* ── Employee: face reg + check-in/out ── */
                <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
                  {!userInfo?.face_registered && (
                    <Alert severity="warning" icon={<MdWarning />} sx={{ mb: 2, borderRadius: 2 }}>
                      Register your face first to enable attendance tracking.
                    </Alert>
                  )}
                  {data?.actions_available?.includes('register_face') && (
                    <RegisterFace workspaceId={workspaceId} onSuccess={loadData} />
                  )}
                  <div style={{ height: 16 }} />
                  <MarkAttendance workspaceId={workspaceId} />
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ══════════════════════════════
              MEMBERS TAB — ADMIN ONLY
          ══════════════════════════════ */}
          {tab === 'members' && isAdmin && (
            <motion.div key="members"
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              <MembersList workspaceId={workspaceId} onInvite={() => setShowInvite(true)} />
            </motion.div>
          )}

          {/* Non-admin trying to access members tab */}
          {tab === 'members' && !isAdmin && (
            <motion.div key="members-blocked"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <MdAdminPanelSettings size={48} color="var(--txt-4)" style={{ marginBottom: 12 }} />
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--txt-3)', marginBottom: 6 }}>Admin Access Required</div>
              <div className="txt-muted" style={{ fontSize: 13 }}>You don't have permission to view member management.</div>
            </motion.div>
          )}

          {/* ══════════════════════════════
              PRODUCTIVITY TAB
          ══════════════════════════════ */}
          {tab === 'productivity' && (
            <motion.div key="productivity"
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              <ProductivityReport
                workspaceId={parseInt(workspaceId)}
                userId={user?.userId}
                isAdmin={isAdmin}
              />
            </motion.div>
          )}
          </AnimatePresence>

        </div>
      </div>

      <AnimatePresence>
        {showInvite && (
          <InviteModal workspaceId={workspaceId} onClose={() => setShowInvite(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}