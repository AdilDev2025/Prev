import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { productivityApi } from '../../api/client';

// ─── Animation variants ───────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.32, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const rowAnim = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 260, damping: 22 } },
};

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
function fmt(v, d = 1) { return v != null && !isNaN(v) ? Number(v).toFixed(d) : '—'; }
function pct(v) { return v != null && !isNaN(v) ? (Number(v) * 100).toFixed(1) + '%' : '—'; }
function scoreColor(s) {
  if (s >= 80) return '#56cfb2';
  if (s >= 60) return '#f5c76a';
  return '#e94560';
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
        style={{
          width: 26, height: 26,
          border: '2px solid rgba(255,255,255,0.07)',
          borderTop: '2px solid #00b4d8',
          borderRadius: '50%',
        }}
      />
    </div>
  );
}

// ─── Alert ────────────────────────────────────────────────────────────────────
function Msg({ text }) {
  if (!text) return null;
  const ok = text.startsWith('ok');
  const label = text.replace(/^(ok|err):/, '');
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
      style={{
        borderRadius: 8, padding: '9px 14px', fontSize: 13, marginBottom: 14,
        background: ok ? 'rgba(86,207,178,0.1)' : 'rgba(233,69,96,0.1)',
        border: `1px solid ${ok ? 'rgba(86,207,178,0.28)' : 'rgba(233,69,96,0.28)'}`,
        color: ok ? '#56cfb2' : '#f08090',
      }}
    >
      {label}
    </motion.div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ value, label, color, i }) {
  return (
    <motion.div
      custom={i}
      variants={fadeUp}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12, padding: '16px 18px',
        minWidth: 100, flex: '1 1 100px',
      }}
    >
      <div style={{
        fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px',
        color: color || '#eeeaff',
        fontFamily: '"DM Mono", monospace',
      }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: '#4a4870', marginTop: 4, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {label}
      </div>
    </motion.div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHead({ title, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 14,
    }}>
      <h3 style={{
        margin: 0, fontSize: 14, fontWeight: 800, color: '#c8c4e8',
        letterSpacing: '-0.2px',
      }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

// ─── Table wrapper ────────────────────────────────────────────────────────────
function TableWrap({ cols, rows }) {
  return (
    <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
            {cols.map(c => (
              <th key={c} style={{
                padding: '9px 14px', textAlign: 'left',
                fontSize: 10, fontWeight: 700, color: '#4a4860',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                fontFamily: '"DM Mono", monospace',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                whiteSpace: 'nowrap',
              }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <motion.tbody variants={stagger} initial="hidden" animate="visible">
          {rows}
        </motion.tbody>
      </table>
    </div>
  );
}

function TD({ children, mono, bold, noWrap }) {
  return (
    <td style={{
      padding: '12px 14px',
      color: '#c0bcdc',
      fontFamily: mono ? '"DM Mono", monospace' : 'inherit',
      fontWeight: bold ? 700 : 400,
      whiteSpace: noWrap ? 'nowrap' : undefined,
      borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}>
      {children}
    </td>
  );
}

// ─── Toggle buttons ───────────────────────────────────────────────────────────
function Toggle({ value, options, onChange }) {
  return (
    <div style={{
      display: 'flex', gap: 3,
      background: 'rgba(255,255,255,0.05)',
      borderRadius: 8, padding: 3,
    }}>
      {options.map(o => (
        <motion.button
          key={o.value}
          whileTap={{ scale: 0.95 }}
          onClick={() => onChange(o.value)}
          style={{
            border: 'none', borderRadius: 6, padding: '4px 14px',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit', letterSpacing: '0.01em',
            background: value === o.value ? 'rgba(0,180,216,0.2)' : 'transparent',
            color: value === o.value ? '#5ecfec' : '#5a5878',
            transition: 'all .15s',
          }}
        >
          {o.label}
        </motion.button>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ProductivityReport({ workspaceId, userId, isAdmin }) {
  const [snapshots, setSnapshots] = useState([]);
  const [allSnapshots, setAllSnapshots] = useState([]);
  const [latest, setLatest] = useState(null);
  const [liveHours, setLiveHours] = useState(null);
  const [workspaceLive, setWorkspaceLive] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [viewMode, setViewMode] = useState(isAdmin ? 'all' : 'mine');
  const [genLoading, setGenLoading] = useState(false);
  const [genMsg, setGenMsg] = useState('');
  const [genAllLoading, setGenAllLoading] = useState(false);
  const [genAllMsg, setGenAllMsg] = useState('');
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const timerRef = useRef(null);

  useEffect(() => { loadData(); }, [userId, workspaceId]);
  useEffect(() => {
    timerRef.current = setInterval(refreshLive, 30000);
    return () => clearInterval(timerRef.current);
  }, [userId, workspaceId, isAdmin]);

  async function loadData() {
    setLoading(true); setErr('');
    try {
      const r = await Promise.allSettled([
        productivityApi.getSnapshots(userId, workspaceId),
        productivityApi.getLatest(userId, workspaceId),
        productivityApi.getLiveHours(userId, workspaceId),
        ...(isAdmin ? [productivityApi.getWorkspaceSnapshots(workspaceId), productivityApi.getWorkspaceLiveHours(workspaceId)] : [])
      ]);
      if (r[0].status === 'fulfilled') setSnapshots(r[0].value.data || []);
      if (r[1].status === 'fulfilled') setLatest(r[1].value.data || null);
      if (r[2].status === 'fulfilled') setLiveHours(r[2].value.data || null);
      if (isAdmin && r[3]?.status === 'fulfilled') setAllSnapshots(r[3].value.data || []);
      if (isAdmin && r[4]?.status === 'fulfilled') setWorkspaceLive(r[4].value.data || []);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  async function refreshLive() {
    try {
      const r = await productivityApi.getLiveHours(userId, workspaceId);
      setLiveHours(r.data || null);
      if (isAdmin) { const w = await productivityApi.getWorkspaceLiveHours(workspaceId); setWorkspaceLive(w.data || []); }
    } catch {}
  }

  async function handleGenerate() {
    setGenLoading(true); setGenMsg('');
    try {
      await productivityApi.createSnapshot(userId, workspaceId, new Date(startDate).toISOString(), new Date(endDate).toISOString());
      setGenMsg('ok:Snapshot generated'); await loadData();
    } catch (e) { setGenMsg('err:' + e.message); }
    finally { setGenLoading(false); }
  }

  async function handleGenerateAll() {
    setGenAllLoading(true); setGenAllMsg('');
    try {
      const r = await productivityApi.generateAll(workspaceId, new Date(startDate).toISOString(), new Date(endDate).toISOString());
      setGenAllMsg('ok:' + (r.message || 'Done'));
      await loadData();
    } catch (e) { setGenAllMsg('err:' + e.message); }
    finally { setGenAllLoading(false); }
  }

  const displayData = isAdmin && viewMode === 'all' ? allSnapshots : snapshots;
  const showMember = isAdmin && viewMode === 'all';

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 8, padding: '8px 12px',
    fontSize: 13, color: '#c0bcdc',
    fontFamily: '"DM Mono", monospace',
    outline: 'none', cursor: 'pointer',
  };

  const btnPrimary = (disabled) => ({
    background: disabled ? 'rgba(0,180,216,0.2)' : 'linear-gradient(135deg,#00b4d8,#56cfb2)',
    border: 'none', borderRadius: 8, padding: '8px 18px',
    fontSize: 13, fontWeight: 700, color: disabled ? '#3a6070' : '#0a1628',
    cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
    letterSpacing: '-0.1px',
  });

  const btnSecondary = (disabled) => ({
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, padding: '8px 18px',
    fontSize: 13, fontWeight: 700, color: disabled ? '#444' : '#8b8aab',
    cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
  });

  return (
    <div style={{ fontFamily: '"DM Sans","Helvetica Neue",sans-serif', color: '#e8e6f0' }}>

      {/* ── Productivity Score ─────────────────────────────── */}
      <motion.div variants={fadeUp} custom={0} initial="hidden" animate="visible" style={{ marginBottom: 28 }}>
        <SectionHead title="Productivity Score">
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={loadData}
            style={btnSecondary(false)}
          >
            Refresh
          </motion.button>
        </SectionHead>

        {latest ? (
          <motion.div
            variants={stagger} initial="hidden" animate="visible"
            style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}
          >
            {[
              { v: fmt(latest.finalScore), l: 'Score /100', c: scoreColor(latest.finalScore) },
              { v: fmt(latest.totalHours) + 'h', l: 'Total Hours' },
              { v: pct(latest.avgConfidence), l: 'Avg Confidence' },
              { v: pct(latest.attendanceScore), l: 'Attendance' },
              { v: pct(latest.reliabilityScore), l: 'Reliability' },
              { v: fmt(latest.afterHours) + 'h', l: 'After Hours' },
            ].map(({ v, l, c }, i) => (
              <StatCard key={l} value={v} label={l} color={c} i={i} />
            ))}
          </motion.div>
        ) : (
          <motion.div variants={fadeUp} custom={1}
            style={{
              textAlign: 'center', padding: '36px 24px',
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14,
            }}
          >
            <p style={{ margin: 0, color: '#4a4870', fontSize: 14 }}>
              No snapshot yet — generate one below.
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* ── Live Hours (Employee) ──────────────────────────── */}
      <AnimatePresence>
        {!isAdmin && liveHours && (
          <motion.div
            key="live-emp"
            variants={fadeUp} custom={1} initial="hidden" animate="visible" exit={{ opacity: 0 }}
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14, padding: '20px 22px', marginBottom: 22,
            }}
          >
            <SectionHead title={`Live Hours — ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: liveHours.active_session ? 16 : 0 }}>
              {[
                [liveHours.today?.total_hours?.toFixed(1) + 'h' || '0.0h', 'Today'],
                [liveHours.month?.total_hours?.toFixed(1) + 'h' || '0.0h', 'Month'],
                [liveHours.month?.after_hours?.toFixed(1) + 'h' || '0.0h', 'After Hrs'],
                [liveHours.month?.sessions_count || 0, 'Sessions'],
              ].map(([v, l], i) => <StatCard key={l} value={v} label={l} i={i} />)}
            </div>

            {liveHours.active_session && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', borderRadius: 10,
                  background: 'rgba(86,207,178,0.08)',
                  border: '1px solid rgba(86,207,178,0.22)',
                }}
              >
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                  style={{ width: 8, height: 8, borderRadius: '50%', background: '#56cfb2', flexShrink: 0 }}
                />
                <div>
                  <strong style={{ color: '#56cfb2', fontSize: 14 }}>
                    Active since {new Date(liveHours.active_session.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </strong>
                  <p style={{ margin: 0, fontSize: 12, color: '#4a6860' }}>
                    {liveHours.active_session.elapsed_hours?.toFixed(1)}h elapsed
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Live Hours (Admin) ────────────────────────────── */}
      <AnimatePresence>
        {isAdmin && workspaceLive.length > 0 && (
          <motion.div
            key="live-admin"
            variants={fadeUp} custom={1} initial="hidden" animate="visible" exit={{ opacity: 0 }}
            style={{ marginBottom: 22 }}
          >
            <SectionHead title="Employee Live Hours" />
            <TableWrap
              cols={['Employee', 'Status', 'Today', 'Month', 'After Hrs', 'Sessions']}
              rows={workspaceLive.map(e => (
                <motion.tr key={e.user_id} variants={rowAnim}>
                  <TD>
                    <strong style={{ color: '#eeeaff' }}>{e.name}</strong>
                    <div style={{ fontSize: 11, color: '#4a4870' }}>{e.email}</div>
                  </TD>
                  <TD>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '2px 10px', borderRadius: 20,
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                      fontFamily: '"DM Mono", monospace',
                      background: e.is_active ? 'rgba(86,207,178,0.12)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${e.is_active ? 'rgba(86,207,178,0.25)' : 'rgba(255,255,255,0.08)'}`,
                      color: e.is_active ? '#56cfb2' : '#5a5878',
                    }}>
                      {e.is_active && (
                        <motion.span
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ duration: 1.4, repeat: Infinity }}
                          style={{ width: 6, height: 6, borderRadius: '50%', background: '#56cfb2', display: 'inline-block' }}
                        />
                      )}
                      {e.is_active ? 'Active' : 'Offline'}
                    </span>
                  </TD>
                  <TD bold mono>{e.today_hours?.toFixed(1)}h</TD>
                  <TD bold mono>{e.month_hours?.toFixed(1)}h</TD>
                  <TD>
                    {e.month_after_hours > 0
                      ? <span style={{ color: '#f5c76a', fontWeight: 700, fontFamily: '"DM Mono", monospace' }}>{e.month_after_hours.toFixed(1)}h</span>
                      : <span style={{ color: '#353350' }}>—</span>}
                  </TD>
                  <TD mono>{e.sessions_count}</TD>
                </motion.tr>
              ))}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Generate Snapshot ─────────────────────────────── */}
      <motion.div
        variants={fadeUp} custom={2} initial="hidden" animate="visible"
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 14, padding: '20px 22px', marginBottom: 24,
        }}
      >
        <SectionHead title="Generate Snapshot" />
        <AnimatePresence><Msg text={genMsg} /></AnimatePresence>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={handleGenerate} disabled={genLoading}
            style={btnPrimary(genLoading)}
          >
            {genLoading ? 'Generating...' : 'Generate Mine'}
          </motion.button>
          {isAdmin && (
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={handleGenerateAll} disabled={genAllLoading}
              style={btnSecondary(genAllLoading)}
            >
              {genAllLoading ? 'Generating...' : 'All Members'}
            </motion.button>
          )}
        </div>

        <AnimatePresence><Msg text={genAllMsg} /></AnimatePresence>
      </motion.div>

      {/* ── Snapshot History ──────────────────────────────── */}
      <motion.div variants={fadeUp} custom={3} initial="hidden" animate="visible">
        <SectionHead title="Snapshot History">
          {isAdmin && (
            <Toggle
              value={viewMode}
              options={[{ value: 'all', label: 'All' }, { value: 'mine', label: 'Mine' }]}
              onChange={setViewMode}
            />
          )}
        </SectionHead>

        <AnimatePresence>
          {err && <Msg text={'err:' + err} />}
        </AnimatePresence>

        {loading ? <Spinner />
          : displayData.length === 0
            ? (
              <motion.p variants={fadeUp} custom={0} style={{ color: '#4a4870', fontSize: 14, textAlign: 'center', padding: '28px 0' }}>
                No snapshots yet.
              </motion.p>
            )
            : (
              <TableWrap
                cols={[
                  ...(showMember ? ['Member'] : []),
                  'Period', 'Score', 'Hours', 'After Hrs', 'Confidence', 'Generated',
                ]}
                rows={displayData.map(s => (
                  <motion.tr key={s.id} variants={rowAnim}>
                    {showMember && <TD><strong style={{ color: '#eeeaff' }}>{s.user?.name || `#${s.userId}`}</strong></TD>}
                    <TD noWrap mono>
                      {new Date(s.periodStart).toLocaleDateString()} – {new Date(s.periodEnd).toLocaleDateString()}
                    </TD>
                    <TD>
                      <span style={{ color: scoreColor(s.finalScore), fontWeight: 800, fontFamily: '"DM Mono", monospace' }}>
                        {fmt(s.finalScore)}
                      </span>
                    </TD>
                    <TD mono>{fmt(s.totalHours)}h</TD>
                    <TD>
                      {s.afterHours > 0
                        ? <span style={{ color: '#f5c76a', fontWeight: 700, fontFamily: '"DM Mono", monospace' }}>{fmt(s.afterHours)}h</span>
                        : <span style={{ color: '#353350' }}>—</span>}
                    </TD>
                    <TD mono>{pct(s.avgConfidence)}</TD>
                    <TD noWrap mono>{new Date(s.generatedAt).toLocaleDateString()}</TD>
                  </motion.tr>
                ))}
              />
            )}
      </motion.div>
    </div>
  );
}