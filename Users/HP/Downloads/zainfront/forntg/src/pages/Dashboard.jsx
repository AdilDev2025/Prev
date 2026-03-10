import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { dashboardApi, workspaceApi } from '../api/client';
import Sidebar from '../components/Sidebar';

import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';

import {
  MdAdd, MdLink, MdClose, MdDelete, MdMenu,
  MdArrowForward, MdWorkspaces, MdGroup,
  MdMailOutline, MdHourglassEmpty,
  MdLightMode, MdDarkMode,
} from 'react-icons/md';

import {
  Tooltip, Avatar, Skeleton, Chip,
} from '@mui/material';

// ─── Animation variants ───────────────────────────────────────────────────
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const fadeUp = {
  hidden:  { opacity: 0, y: 22, filter: 'blur(4px)' },
  visible: { opacity: 1, y: 0,  filter: 'blur(0px)', transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

const scaleIn = {
  hidden:  { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1,    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } },
};

// ─── Theme Toggle — framer-motion spring ─────────────────────────────────
function ThemeToggle({ theme, toggle }) {
  const isDark = theme === 'dark';
  return (
    <motion.button
      onClick={toggle}
      aria-label="Toggle theme"
      style={{
        position: 'relative', width: 56, height: 28,
        borderRadius: 99, border: 'none', cursor: 'pointer', padding: 0,
        background: isDark
          ? 'linear-gradient(135deg, #1a1035 0%, #2d1f6e 100%)'
          : 'linear-gradient(135deg, #74c0fc 0%, #339af0 100%)',
        boxShadow: isDark
          ? '0 0 0 1px rgba(255,255,255,.08), 0 2px 12px rgba(109,68,248,.4)'
          : '0 0 0 1px rgba(0,0,0,.06), 0 2px 12px rgba(51,154,240,.35)',
        overflow: 'hidden',
        flexShrink: 0,
      }}
      whileTap={{ scale: 0.93 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {/* Stars — visible in dark mode */}
      {[{ top: 6, left: 8 }, { top: 13, left: 15 }, { top: 7, left: 22 }].map((s, i) => (
        <motion.span key={i} animate={{ opacity: isDark ? 0.9 : 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'absolute', top: s.top, left: s.left,
            width: i === 2 ? 1.5 : 2, height: i === 2 ? 1.5 : 2,
            borderRadius: '50%', background: '#fff',
          }} />
      ))}

      {/* Sun rays — visible in light mode */}
      <motion.div
        animate={{ opacity: isDark ? 0 : 1, rotate: isDark ? 0 : 180 }}
        transition={{ duration: 0.4 }}
        style={{
          position: 'absolute', top: 4, right: 6,
          width: 20, height: 20, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <MdLightMode size={13} color="rgba(255,255,255,0.9)" />
      </motion.div>

      {/* Moon — visible in dark mode */}
      <motion.div
        animate={{ opacity: isDark ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        style={{ position: 'absolute', top: 4, left: 7 }}
      >
        <MdDarkMode size={13} color="rgba(200,180,255,0.9)" />
      </motion.div>

      {/* Thumb */}
      <motion.span
        layout
        animate={{ x: isDark ? 30 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{
          position: 'absolute', top: 3,
          width: 22, height: 22, borderRadius: '50%',
          background: isDark
            ? 'linear-gradient(135deg, #e8deff 0%, #c4b3f5 100%)'
            : 'linear-gradient(135deg, #fff5b8 0%, #ffd43b 100%)',
          boxShadow: isDark
            ? '0 2px 8px rgba(0,0,0,.5)'
            : '0 2px 8px rgba(255,180,0,.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      />
    </motion.button>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, value, label, color }) {
  return (
    <motion.div variants={fadeUp}
      whileHover={{ y: -3, boxShadow: `0 12px 40px ${color}22`, transition: { duration: 0.2 } }}
      style={{
        flex: 1, minWidth: 130,
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '18px 20px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: `${color}14`, border: `1px solid ${color}28`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 24, fontWeight: 900, color: 'var(--txt)', lineHeight: 1 }}
        >
          {value}
        </motion.div>
        <div style={{ fontSize: 11, color: 'var(--txt-4)', marginTop: 4, fontWeight: 700, letterSpacing: .5, textTransform: 'uppercase' }}>
          {label}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Workspace card ───────────────────────────────────────────────────────
function WorkspaceCard({ ws, onOpen, onDelete, deleting }) {
  const initial = ws.name?.[0]?.toUpperCase() || 'W';
  return (
    <motion.div
      variants={scaleIn}
      whileHover={{ y: -4, boxShadow: '0 16px 48px rgba(79,142,247,.15)', transition: { duration: 0.22 } }}
      whileTap={{ scale: 0.98 }}
      onClick={onOpen}
      style={{
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        borderRadius: 18, padding: '22px 20px', cursor: 'pointer',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Subtle gradient accent top-right */}
      <div style={{
        position: 'absolute', top: -30, right: -30,
        width: 100, height: 100, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(79,142,247,.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <Avatar sx={{
          width: 44, height: 44, fontSize: 17, fontWeight: 900,
          background: 'linear-gradient(135deg, var(--accent) 0%, #6D44F8 100%)',
          borderRadius: '12px',
        }}>
          {initial}
        </Avatar>

        <Tooltip title="Delete workspace" placement="top">
          <motion.button
            whileHover={{ scale: 1.1, color: '#EF4444' }}
            whileTap={{ scale: 0.9 }}
            onClick={e => { e.stopPropagation(); onDelete(); }}
            disabled={deleting}
            style={{
              background: 'var(--bg-3)', border: '1px solid var(--border)',
              borderRadius: 8, width: 30, height: 30, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--txt-4)',
            }}
          >
            {deleting ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--txt-4)', borderTopColor: 'transparent' }} />
            ) : (
              <MdDelete size={14} />
            )}
          </motion.button>
        </Tooltip>
      </div>

      <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--txt)', marginBottom: 4 }}>{ws.name}</div>
      <div style={{ fontSize: 12, color: 'var(--txt-4)', marginBottom: 14 }}>
        Created {new Date(ws.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Chip label={`#${ws.id}`} size="small" sx={{
          bgcolor: 'rgba(79,142,247,.1)', color: 'var(--accent)',
          fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 10, height: 20,
        }} />
        <motion.div
          whileHover={{ x: 3 }}
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}
        >
          Open <MdArrowForward size={14} />
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Inline form card ─────────────────────────────────────────────────────
function FormCard({ title, icon: Icon, onClose, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0,   scale: 1 }}
      exit={{   opacity: 0, y: -8,   scale: 0.97 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: 'var(--bg-2)', border: '1px solid var(--accent-border)',
        borderRadius: 16, padding: '20px 22px', marginBottom: 20,
        boxShadow: '0 4px 24px rgba(79,142,247,.1)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'rgba(79,142,247,.1)', border: '1px solid rgba(79,142,247,.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={16} color="var(--accent)" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--txt)' }}>{title}</span>
        </div>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          onClick={onClose}
          style={{
            background: 'var(--bg-3)', border: '1px solid var(--border)',
            borderRadius: 7, width: 28, height: 28, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--txt-4)',
          }}
        >
          <MdClose size={14} />
        </motion.button>
      </div>
      {children}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [sideOpen, setSideOpen]   = useState(false);
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);

  const [newName, setNewName]       = useState('');
  const [creating, setCreating]     = useState(false);
  const [createErr, setCreateErr]   = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const [inviteId, setInviteId]   = useState('');
  const [joining, setJoining]     = useState(false);
  const [joinMsg, setJoinMsg]     = useState('');
  const [showJoin, setShowJoin]   = useState(false);

  const [deleting, setDeleting]   = useState(null);

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    setLoading(true);
    try { const d = await dashboardApi.get(); setData(d); } catch {}
    finally { setLoading(false); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true); setCreateErr('');
    try {
      await workspaceApi.create(newName.trim());
      setNewName(''); setShowCreate(false);
      await loadDashboard();
    } catch (e) { setCreateErr(e.message); }
    finally { setCreating(false); }
  }

  async function handleJoin(e) {
    e.preventDefault();
    if (!inviteId.trim()) return;
    setJoining(true); setJoinMsg('');
    try {
      const r = await workspaceApi.acceptInvite(inviteId.trim());
      setJoinMsg('ok:' + (r.message || 'Joined!'));
      setInviteId(''); setShowJoin(false);
      await loadDashboard();
    } catch (e) { setJoinMsg('err:' + e.message); }
    finally { setJoining(false); }
  }

  async function handleDelete(wsId, wsName) {
    if (!confirm(`Delete workspace "${wsName}"? This cannot be undone.`)) return;
    setDeleting(wsId);
    try { await workspaceApi.delete(wsId); await loadDashboard(); }
    catch (e) { alert(e.message); }
    finally { setDeleting(null); }
  }

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="shell">
      <Sidebar isWorkspace={false} isOpen={sideOpen} onClose={() => setSideOpen(false)} />

      <div className="main">
        {/* ── Topbar ── */}
        <header className="topbar" style={{ borderBottom: '1px solid var(--border)', backdropFilter: 'blur(14px)' }}>
          <div className="topbar-l">
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="menu-btn" onClick={() => setSideOpen(o => !o)}
            >
              <MdMenu size={22} />
            </motion.button>
            <span className="topbar-title">Dashboard</span>
          </div>

          <div className="topbar-r" style={{ gap: 10 }}>
            <ThemeToggle theme={theme} toggle={toggleTheme} />

            <Tooltip title="Create a new workspace">
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="btn btn-sm btn-p"
                onClick={() => { setShowCreate(s => !s); setShowJoin(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <MdAdd size={16} /> New Workspace
              </motion.button>
            </Tooltip>

            <Tooltip title="Join via invite code">
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="btn btn-sm"
                onClick={() => { setShowJoin(s => !s); setShowCreate(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <MdLink size={16} /> Join
              </motion.button>
            </Tooltip>
          </div>
        </header>

        <div className="page">
          {/* ── Welcome header ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{ marginBottom: 28 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar sx={{
                width: 46, height: 46, fontSize: 18, fontWeight: 900,
                background: 'linear-gradient(135deg, var(--accent) 0%, #6D44F8 100%)',
              }}>
                {user?.name?.[0]?.toUpperCase()}
              </Avatar>
              <div>
                <motion.h1
                  initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--txt)' }}
                >
                  Welcome back, {firstName}
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  style={{ margin: 0, fontSize: 13, color: 'var(--txt-4)', marginTop: 3 }}
                >
                  Manage your workspaces and monitor your team.
                </motion.p>
              </div>
            </div>
          </motion.div>

          {/* ── Stats ── */}
          {data && (
            <motion.div
              variants={stagger} initial="hidden" animate="visible"
              style={{ display: 'flex', gap: 14, marginBottom: 28, flexWrap: 'wrap' }}
            >
              <StatCard icon={MdWorkspaces}     value={data.stats?.totalWorkspaces ?? 0} label="Workspaces" color="#4F8EF7" />
              <StatCard icon={MdGroup}          value={data.stats?.totalMembers    ?? 0} label="Members"    color="#A855F7" />
              <StatCard icon={MdMailOutline}    value={data.stats?.totalInvites    ?? 0} label="Invites"    color="#22C55E" />
              <StatCard icon={MdHourglassEmpty} value={data.stats?.pendingInvites  ?? 0} label="Pending"    color="#F59E0B" />
            </motion.div>
          )}

          {/* ── Create workspace form ── */}
          <AnimatePresence>
            {showCreate && (
              <FormCard title="New Workspace" icon={MdAdd} onClose={() => setShowCreate(false)}>
                <AnimatePresence>
                  {createErr && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="alert alert-err" style={{ marginBottom: 12 }}>
                      {createErr}
                    </motion.div>
                  )}
                </AnimatePresence>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text" placeholder="e.g. Neuro-Force HQ"
                    value={newName} onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreate(e)}
                    style={{
                      flex: 1, padding: '9px 14px',
                      border: '1px solid var(--border)', borderRadius: 10,
                      background: 'var(--bg-3)', color: 'var(--txt)', fontSize: 14,
                      fontFamily: 'Outfit, sans-serif', outline: 'none',
                    }}
                    autoFocus
                  />
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    className="btn btn-p btn-sm" onClick={handleCreate} disabled={creating}
                  >
                    {creating ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                        style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff' }} />
                    ) : 'Create'}
                  </motion.button>
                </div>
              </FormCard>
            )}
          </AnimatePresence>

          {/* ── Join workspace form ── */}
          <AnimatePresence>
            {showJoin && (
              <FormCard title="Join via Invite Code" icon={MdLink} onClose={() => setShowJoin(false)}>
                <AnimatePresence>
                  {joinMsg && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`alert ${joinMsg.startsWith('ok') ? 'alert-ok' : 'alert-err'}`}
                      style={{ marginBottom: 12 }}>
                      {joinMsg.replace(/^(ok|err):/, '')}
                    </motion.div>
                  )}
                </AnimatePresence>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text" placeholder="Paste invite UUID..."
                    value={inviteId} onChange={e => setInviteId(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleJoin(e)}
                    style={{
                      flex: 1, padding: '9px 14px',
                      border: '1px solid var(--border)', borderRadius: 10,
                      background: 'var(--bg-3)', color: 'var(--txt)', fontSize: 14,
                      fontFamily: 'JetBrains Mono, monospace', outline: 'none',
                    }}
                    autoFocus
                  />
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    className="btn btn-p btn-sm" onClick={handleJoin} disabled={joining}
                  >
                    {joining ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                        style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff' }} />
                    ) : 'Join'}
                  </motion.button>
                </div>
              </FormCard>
            )}
          </AnimatePresence>

          {/* ── Workspaces section header ── */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9,
                background: 'rgba(79,142,247,.1)', border: '1px solid rgba(79,142,247,.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <MdWorkspaces size={16} color="var(--accent)" />
              </div>
              <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--txt)' }}>Your Workspaces</span>
            </div>
            <Chip
              label={`${data?.workspaces?.length || 0} total`}
              size="small"
              sx={{ bgcolor: 'rgba(79,142,247,.1)', color: 'var(--accent)', fontWeight: 700, fontSize: 11, height: 22 }}
            />
          </motion.div>

          {/* ── Workspace grid ── */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              {[1, 2, 3].map(i => (
                <Skeleton key={i} variant="rectangular" height={160}
                  sx={{ borderRadius: '18px', bgcolor: 'var(--bg-2)' }} />
              ))}
            </div>
          ) : !data?.workspaces?.length ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                textAlign: 'center', padding: '56px 24px',
                background: 'var(--bg-2)', border: '1px dashed var(--border)',
                borderRadius: 20,
              }}
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                style={{ fontSize: 48, marginBottom: 16 }}
              >
                <MdWorkspaces size={52} color="var(--txt-4)" />
              </motion.div>
              <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--txt-3)', marginBottom: 8 }}>
                No workspaces yet
              </div>
              <p style={{ color: 'var(--txt-4)', fontSize: 13, margin: '0 0 20px' }}>
                Create a new workspace or join one via an invite link.
              </p>
              <motion.button
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                className="btn btn-p btn-sm"
                onClick={() => setShowCreate(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <MdAdd size={16} /> Create Workspace
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              variants={stagger} initial="hidden" animate="visible"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}
            >
              {data.workspaces.map(ws => (
                <WorkspaceCard
                  key={ws.id}
                  ws={ws}
                  onOpen={() => navigate(`/workspace/${ws.id}`)}
                  onDelete={() => handleDelete(ws.id, ws.name)}
                  deleting={deleting === ws.id}
                />
              ))}

              {/* Add new workspace tile */}
              <motion.div
                variants={scaleIn}
                whileHover={{ y: -4, borderColor: 'var(--accent)', transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowCreate(true)}
                style={{
                  background: 'transparent',
                  border: '2px dashed var(--border)',
                  borderRadius: 18, padding: '22px 20px',
                  cursor: 'pointer', minHeight: 140,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 10,
                }}
              >
                <motion.div
                  whileHover={{ rotate: 90 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'rgba(79,142,247,.08)', border: '1px solid rgba(79,142,247,.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <MdAdd size={20} color="var(--accent)" />
                </motion.div>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt-4)' }}>New Workspace</span>
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}