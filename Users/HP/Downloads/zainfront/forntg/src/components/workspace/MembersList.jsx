import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { workspaceApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

// Stagger container
const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const rowVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 24 } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.18 } },
};

const fadeIn = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28 } },
};

// Avatar initials color palette
const avatarColors = [
  ['#1a1a2e', '#e94560'],
  ['#0d1b2a', '#00b4d8'],
  ['#1b1b2f', '#f5a623'],
  ['#162032', '#56cfb2'],
  ['#1e1b2e', '#b98ee4'],
];
function getAvatarColor(name = '') {
  const i = name.charCodeAt(0) % avatarColors.length;
  return avatarColors[i];
}

// Badge component
function Badge({ type }) {
  const styles = {
    owner:   { bg: 'rgba(185,142,228,0.15)', color: '#c9a6f0', border: '1px solid rgba(185,142,228,0.3)' },
    admin:   { bg: 'rgba(0,180,216,0.12)',   color: '#5ecfec', border: '1px solid rgba(0,180,216,0.25)' },
    user:    { bg: 'rgba(86,207,178,0.12)',   color: '#56cfb2', border: '1px solid rgba(86,207,178,0.25)' },
    present: { bg: 'rgba(86,207,178,0.12)',   color: '#56cfb2', border: '1px solid rgba(86,207,178,0.25)' },
    absent:  { bg: 'rgba(245,166,35,0.12)',   color: '#f5c76a', border: '1px solid rgba(245,166,35,0.28)' },
    exempt:  { bg: 'rgba(185,142,228,0.12)',  color: '#c9a6f0', border: '1px solid rgba(185,142,228,0.28)' },
    face_ok: { bg: 'rgba(86,207,178,0.12)',   color: '#56cfb2', border: '1px solid rgba(86,207,178,0.25)' },
    face_no: { bg: 'rgba(245,166,35,0.12)',   color: '#f5c76a', border: '1px solid rgba(245,166,35,0.28)' },
  };
  const labels = {
    owner: 'Owner', admin: 'Admin', user: 'User',
    present: 'Present', absent: 'Absent', exempt: 'Exempt',
    face_ok: 'Registered', face_no: 'None',
  };
  const s = styles[type] || styles.user;
  return (
    <span style={{
      ...s,
      display: 'inline-block',
      padding: '2px 9px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      fontFamily: '"DM Mono", monospace',
    }}>
      {labels[type] || type}
    </span>
  );
}

// Spinner
function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 140 }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
        style={{
          width: 28, height: 28,
          border: '2px solid rgba(255,255,255,0.08)',
          borderTop: '2px solid #00b4d8',
          borderRadius: '50%',
        }}
      />
    </div>
  );
}

export default function MembersList({ workspaceId, onInvite }) {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [updating, setUpdating] = useState(null);
  const [updateMsg, setUpdateMsg] = useState('');

  useEffect(() => { loadMembers(); }, [workspaceId]);

  async function loadMembers() {
    setLoading(true); setErr('');
    try {
      const r = await workspaceApi.getMembers(workspaceId);
      setMembers(Array.isArray(r) ? r : r.members || []);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  async function handleRoleChange(memberId, newRole) {
    setUpdating(memberId); setUpdateMsg('');
    try {
      await workspaceApi.updateMemberRole(workspaceId, memberId, newRole);
      setUpdateMsg('ok:Role updated');
      await loadMembers();
    } catch (e) { setUpdateMsg('err:' + e.message); }
    finally {
      setUpdating(null);
      setTimeout(() => setUpdateMsg(''), 3000);
    }
  }

  const isOk = updateMsg.startsWith('ok');
  const msgText = updateMsg.replace(/^(ok|err):/, '');

  return (
    <div style={{
      fontFamily: '"DM Sans", "Helvetica Neue", sans-serif',
      color: '#e8e6f0',
    }}>

      {/* Header row */}
      <motion.div
        variants={fadeIn} initial="hidden" animate="visible"
        style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <div>
          <h2 style={{
            margin: 0, fontSize: 18, fontWeight: 800,
            color: '#f0eeff', letterSpacing: '-0.4px',
          }}>
            Members
            <span style={{
              marginLeft: 10, fontSize: 12, fontWeight: 600,
              color: '#5ecfec', background: 'rgba(0,180,216,0.12)',
              border: '1px solid rgba(0,180,216,0.2)',
              padding: '2px 8px', borderRadius: 20,
              fontFamily: '"DM Mono", monospace',
              verticalAlign: 'middle',
            }}>
              {members.length}
            </span>
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: '#6a6880' }}>
            Manage roles and track attendance
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onInvite}
          style={{
            background: 'linear-gradient(135deg, #00b4d8, #56cfb2)',
            border: 'none', borderRadius: 9, padding: '9px 18px',
            fontSize: 13, fontWeight: 700, color: '#0a1628',
            cursor: 'pointer', letterSpacing: '-0.1px',
            boxShadow: '0 4px 18px rgba(0,180,216,0.28)',
          }}
        >
          Invite Member
        </motion.button>
      </motion.div>

      {/* Alert messages */}
      <AnimatePresence>
        {err && (
          <motion.div
            key="err"
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            style={{
              background: 'rgba(233,69,96,0.1)', border: '1px solid rgba(233,69,96,0.28)',
              borderRadius: 8, padding: '10px 14px',
              fontSize: 13, color: '#f08090', marginBottom: 14,
            }}
          >
            {err}
          </motion.div>
        )}
        {updateMsg && (
          <motion.div
            key="msg"
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            style={{
              background: isOk ? 'rgba(86,207,178,0.1)' : 'rgba(233,69,96,0.1)',
              border: `1px solid ${isOk ? 'rgba(86,207,178,0.28)' : 'rgba(233,69,96,0.28)'}`,
              borderRadius: 8, padding: '10px 14px',
              fontSize: 13, color: isOk ? '#56cfb2' : '#f08090', marginBottom: 14,
            }}
          >
            {msgText}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading */}
      {loading && <Spinner />}

      {/* Empty state */}
      {!loading && members.length === 0 && (
        <motion.div
          variants={fadeIn} initial="hidden" animate="visible"
          style={{
            textAlign: 'center', padding: '52px 24px',
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 14,
          }}
        >
          <p style={{ margin: 0, color: '#5a5870', fontSize: 14 }}>
            No members yet — invite your team to get started.
          </p>
        </motion.div>
      )}

      {/* Table */}
      {!loading && members.length > 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 14, overflow: 'hidden',
        }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 90px 110px 100px 100px',
            padding: '10px 20px',
            background: 'rgba(255,255,255,0.03)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            {['Member', 'Role', 'Face', 'Today', 'Action'].map(h => (
              <div key={h} style={{
                fontSize: 10, fontWeight: 700, color: '#4a4860',
                textTransform: 'uppercase', letterSpacing: '0.09em',
                fontFamily: '"DM Mono", monospace',
              }}>
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          <motion.div variants={listVariants} initial="hidden" animate="visible">
            {members.map((m, i) => {
              const [bgColor, textColor] = getAvatarColor(m.name || '');
              const isMe = m.userId === user?.userId;
              const isOwner = m.isOwner;
              const canEdit = !isOwner && !isMe;

              return (
                <motion.div
                  key={m.id || m.userId}
                  variants={rowVariants}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 90px 110px 100px 100px',
                    padding: '14px 20px',
                    alignItems: 'center',
                    borderBottom: i < members.length - 1
                      ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}
                  whileHover={{ background: 'rgba(255,255,255,0.025)' }}
                  transition={{ duration: 0.15 }}
                >
                  {/* Member */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${bgColor}, ${textColor})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 800, color: '#fff',
                      flexShrink: 0, boxShadow: `0 2px 10px ${textColor}44`,
                    }}>
                      {m.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <strong style={{ fontSize: 14, color: '#eeeaff', fontWeight: 600 }}>
                          {m.name}
                        </strong>
                        {isOwner && <Badge type="owner" />}
                      </div>
                      <div style={{ fontSize: 11, color: '#4a4870', marginTop: 1 }}>{m.email}</div>
                    </div>
                  </div>

                  {/* Role */}
                  <div>
                    <Badge type={m.role === 'admin' || m.role === 'owner' ? 'admin' : 'user'} />
                  </div>

                  {/* Face */}
                  <div>
                    <Badge type={m.face_registered ? 'face_ok' : 'face_no'} />
                  </div>

                  {/* Today */}
                  <div>
                    {m.attendance_exempt
                      ? <Badge type="exempt" />
                      : m.present_today
                        ? <Badge type="present" />
                        : <Badge type="absent" />}
                  </div>

                  {/* Action */}
                  <div>
                    {canEdit ? (
                      <motion.select
                        value={m.role}
                        disabled={updating === (m.id || m.userId)}
                        onChange={e => handleRoleChange(m.userId || m.id, e.target.value)}
                        whileFocus={{ scale: 1.02 }}
                        style={{
                          fontSize: 12, padding: '5px 8px',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 7,
                          background: 'rgba(255,255,255,0.06)',
                          color: '#c0bcdc',
                          cursor: 'pointer',
                          fontFamily: '"DM Mono", monospace',
                          outline: 'none',
                          opacity: updating === (m.id || m.userId) ? 0.5 : 1,
                        }}
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </motion.select>
                    ) : (
                      <span style={{ fontSize: 12, color: '#353350' }}>—</span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      )}
    </div>
  );
}