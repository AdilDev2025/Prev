import { useState, useEffect, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { attendanceApi } from '../../api/client';

const REGULAR_HRS = 8;

function fmt(h) {
  const hh = Math.floor(h), mm = Math.floor((h-hh)*60), ss = Math.floor(((h-hh)*60-mm)*60);
  return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
}

/* ─── Inline camera widget ──────────────────────────────────────────────── */
function CameraWidget({ onCapture, captureLabel = 'Capture', onCancel }) {
  const [step, setStep]       = useState('live');
  const [preview, setPreview] = useState(null);
  const [camErr, setCamErr]   = useState('');
  const webcamRef = useRef(null);
  const fileRef   = useRef(null);

  const snap = useCallback(() => {
    const src = webcamRef.current?.getScreenshot();
    if (!src) return;
    fetch(src).then(r => r.blob()).then(blob => {
      const f = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
      setPreview(src); setStep('preview'); onCapture(f);
    });
  }, [onCapture]);

  function retake() { setPreview(null); setStep('live'); onCapture(null); }

  function handleFile(e) {
    const f = e.target.files?.[0]; if (!f) return;
    const url = URL.createObjectURL(f);
    setPreview(url); setStep('preview'); onCapture(f); e.target.value = '';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {step === 'live' && (
        <>
          <Webcam ref={webcamRef} audio={false}
            screenshotFormat="image/jpeg" screenshotQuality={0.92} mirrored={true}
            videoConstraints={{ facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }}
            onUserMediaError={() => setCamErr('Camera blocked — allow permission in browser.')}
            style={{
              width: '100%', maxWidth: 460, borderRadius: 12,
              border: '2px solid var(--accent)', display: 'block',
              boxShadow: '0 0 28px var(--accent-glow)',
            }}
          />
          {camErr && <div className="alert alert-err">{camErr}</div>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-p btn-sm" type="button" onClick={snap}>📸 {captureLabel}</button>
            <button className="btn btn-sm" type="button" onClick={() => fileRef.current?.click()}>📁 Upload</button>
            {onCancel && <button className="btn btn-sm" type="button" onClick={onCancel}>✕ Cancel</button>}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
          </div>
        </>
      )}
      {step === 'preview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <img src={preview} alt="preview" style={{
            width: '100%', maxWidth: 280, borderRadius: 12,
            border: '2px solid var(--green)', display: 'block',
          }} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="badge badge-green">✅ Photo Ready</span>
            <button className="btn btn-xs" type="button" onClick={retake}>🔄 Retake</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Step progress bar ─────────────────────────────────────────────────── */
const STEPS = [
  { key: 'register', icon: '🧠', label: 'Register'  },
  { key: 'checkin',  icon: '🕐', label: 'Check In'  },
  { key: 'session',  icon: '⏱',  label: 'Working'   },
  { key: 'checkout', icon: '🚪', label: 'Check Out' },
];

function StepBar({ current }) {
  const idx = STEPS.findIndex(s => s.key === current);
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
      {STEPS.map((s, i) => {
        const done = i < idx, active = i === idx;
        return (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: done ? 16 : 18, fontWeight: 800, transition: 'all .35s',
                background: done   ? 'var(--green)'
                          : active ? 'linear-gradient(135deg,var(--accent),var(--accent-2,#6D44F8))'
                          : 'var(--bg-3)',
                border: done   ? '2px solid var(--green)'
                      : active ? '2px solid var(--accent)'
                      : '2px solid var(--border-2)',
                color: done || active ? '#fff' : 'var(--txt-4)',
                boxShadow: active ? '0 0 18px var(--accent-glow)' : 'none',
              }}>
                {done ? '✓' : s.icon}
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: .6,
                textTransform: 'uppercase', whiteSpace: 'nowrap',
                color: active ? 'var(--accent)' : done ? 'var(--green)' : 'var(--txt-4)',
              }}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 2, margin: '0 6px', marginBottom: 22,
                background: done ? 'var(--green)' : 'var(--border)',
                transition: 'background .4s',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Animated card wrapper ─────────────────────────────────────────────── */
function AnimCard({ animKey, children }) {
  return (
    <>
      <style>{`
        @keyframes flip-in {
          from { transform: rotateY(-90deg) scale(.97); opacity: 0; }
          to   { transform: rotateY(0deg)   scale(1);   opacity: 1; }
        }
        .flip-in { animation: flip-in .45s cubic-bezier(.4,0,.2,1) forwards; }
        @keyframes pbar { from{width:0%} to{width:100%} }
        @keyframes fadein { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .fadein { animation: fadein .3s ease forwards; }
      `}</style>
      <div key={animKey} className="flip-in">{children}</div>
    </>
  );
}

/* ─── Shared success + progress bar ────────────────────────────────────── */
function SuccessBanner({ emoji, title, subtitle, badges = [], duration = 2100, color = 'var(--green)', bg = 'var(--green-bg)', border = 'var(--green-b)' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ textAlign: 'center', padding: '28px 16px', background: bg, border: `1px solid ${border}`, borderRadius: 12 }}>
        <div style={{ fontSize: 52, marginBottom: 10 }}>{emoji}</div>
        <strong style={{ fontSize: 19, color }}>{title}</strong>
        {badges.length > 0 && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 14, flexWrap: 'wrap' }}>
            {badges}
          </div>
        )}
        {subtitle && <p className="txt-muted" style={{ fontSize: 13, marginTop: 8 }}>{subtitle}</p>}
      </div>
      <div style={{ height: 4, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
        <div style={{ height: '100%', background: color, borderRadius: 99, animation: `pbar ${duration}ms linear forwards` }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export default function MarkAttendance({ workspaceId, faceRegistered = false }) {
  const [step, setStep]       = useState(faceRegistered ? 'checkin' : 'register');
  const [animKey, setAnimKey] = useState(0);
  const [statusLoading, setSL]= useState(true);

  const [checkedIn, setCheckedIn] = useState(false);
  const [session, setSession]     = useState(null);
  const [elapsed, setElapsed]     = useState(0);
  const timerRef = useRef(null);

  const [regFile, setRegFile]   = useState(null);
  const [regLoad, setRegLoad]   = useState(false);
  const [regResult, setRegRes]  = useState(null);
  const [regErr, setRegErr]     = useState('');

  const [ciFile, setCiFile]   = useState(null);
  const [ciLoad, setCiLoad]   = useState(false);
  const [ciResult, setCiRes]  = useState(null);
  const [ciErr, setCiErr]     = useState('');

  const [coFile, setCoFile]   = useState(null);
  const [coLoad, setCoLoad]   = useState(false);
  const [coResult, setCoRes]  = useState(null);
  const [coErr, setCoErr]     = useState('');

  useEffect(() => {
    loadStatus();
    return () => clearInterval(timerRef.current);
  }, [workspaceId]);

  async function loadStatus() {
    setSL(true);
    try {
      const d = await attendanceApi.getStatus(workspaceId);
      setCheckedIn(d.checked_in); setSession(d.session);
      if (d.checked_in && d.session) { startTimer(new Date(d.session.check_in)); goTo('session'); }
    } catch { setCheckedIn(false); setSession(null); }
    finally { setSL(false); }
  }

  function startTimer(t) {
    clearInterval(timerRef.current);
    const tick = () => setElapsed((Date.now() - t.getTime()) / 3_600_000);
    tick(); timerRef.current = setInterval(tick, 1000);
  }

  function goTo(next, delay = 0) {
    setTimeout(() => { setStep(next); setAnimKey(k => k + 1); }, delay);
  }

  async function handleRegister() {
    if (!regFile) return;
    setRegLoad(true); setRegErr('');
    try {
      const r = await attendanceApi.registerFace(workspaceId, regFile);
      setRegRes(r); goTo('checkin', 2100);
    } catch (e) { setRegErr(e.message || 'Registration failed'); }
    finally { setRegLoad(false); }
  }

  async function handleCheckIn() {
    if (!ciFile) return;
    setCiLoad(true); setCiErr('');
    try {
      const r = await attendanceApi.markAttendance(workspaceId, ciFile);
      setCiRes(r); setCiFile(null);
      await loadStatus();
      goTo('session', 2100);
    } catch (e) {
      if (e.status === 409) { await loadStatus(); setCiErr('Already checked in.'); }
      else setCiErr(e.message || 'Check-in failed');
    } finally { setCiLoad(false); }
  }

  async function handleCheckOut() {
    if (!coFile) return;
    setCoLoad(true); setCoErr('');
    try {
      const r = await attendanceApi.checkOut(workspaceId, coFile);
      setCoRes(r); setCoFile(null);
      clearInterval(timerRef.current);
      setCheckedIn(false); setSession(null); setElapsed(0);
      goTo('checkin', 2600);
    } catch (e) { setCoErr(e.message || 'Check-out failed'); }
    finally { setCoLoad(false); }
  }

  const afterHrs = Math.max(0, elapsed - REGULAR_HRS);
  const isAfterH = afterHrs > 0;
  const pct      = Math.min((elapsed / REGULAR_HRS) * 100, 100);

  if (statusLoading) return (
    <div className="page-center" style={{ minHeight: 200 }}>
      <div className="spinner" />
      <p className="txt-muted" style={{ marginTop: 10 }}>Loading session...</p>
    </div>
  );

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <StepBar current={step} />

      {/* ── REGISTER ── */}
      {step === 'register' && (
        <AnimCard animKey={animKey}>
          <div className="card" style={{ border: regResult ? '1px solid var(--green-b)' : '1px solid var(--accent-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{ width:52, height:52, borderRadius:14, flexShrink:0,
                background:'rgba(79,142,247,.12)', border:'1px solid var(--accent-border)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>🧠</div>
              <div>
                <div style={{ fontWeight:800, fontSize:17 }}>Register Your Face</div>
                <div className="txt-muted" style={{ fontSize:13 }}>Step 1 of 3 — One-time biometric setup</div>
              </div>
            </div>
            {!regResult && (
              <div className="fadein" style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div style={{ padding:'10px 14px', borderRadius:8, fontSize:13,
                  background:'rgba(79,142,247,.06)', border:'1px solid var(--accent-border)', color:'var(--txt-3)' }}>
                  💡 Face the camera straight-on in good lighting. This is only done once.
                </div>
                <CameraWidget captureLabel="Capture My Face" onCapture={f => { setRegFile(f); setRegErr(''); }} />
                {regErr && <div className="alert alert-err">{regErr}</div>}
                {regFile && (
                  <button className="btn btn-p" onClick={handleRegister} disabled={regLoad} style={{ alignSelf:'flex-start' }}>
                    {regLoad
                      ? <span style={{ display:'flex', alignItems:'center', gap:8 }}><span className="spinner" style={{ width:14,height:14,borderWidth:2 }}/>Registering...</span>
                      : '🧬 Register Face & Continue →'}
                  </button>
                )}
              </div>
            )}
            {regResult && (
              <div className="fadein">
                <SuccessBanner emoji="✅" title="Face Registered!" subtitle="Embedding stored · Advancing to Check In…"
                  badges={[
                    <span key="u" className="badge badge-green">User: {regResult.user_id}</span>,
                    <span key="w" className="badge badge-green">WS: {regResult.workspace_id}</span>,
                  ]} duration={2100} />
              </div>
            )}
          </div>
        </AnimCard>
      )}

      {/* ── CHECK IN ── */}
      {step === 'checkin' && (
        <AnimCard animKey={animKey}>
          <div className="card" style={{ border: ciResult ? '1px solid var(--green-b)' : '1px solid var(--border)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
              <div style={{ width:52, height:52, borderRadius:14, flexShrink:0,
                background:'var(--green-bg)', border:'1px solid var(--green-b)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>🕐</div>
              <div>
                <div style={{ fontWeight:800, fontSize:17 }}>Check In</div>
                <div className="txt-muted" style={{ fontSize:13 }}>Face the camera to start your work session</div>
              </div>
            </div>
            {!ciResult && (
              <div className="fadein" style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <CameraWidget captureLabel="Capture for Check In" onCapture={f => { setCiFile(f); setCiErr(''); }} />
                {ciErr && <div className="alert alert-err">{ciErr}</div>}
                {ciFile && (
                  <button className="btn btn-p" onClick={handleCheckIn} disabled={ciLoad} style={{ alignSelf:'flex-start' }}>
                    {ciLoad
                      ? <span style={{ display:'flex', alignItems:'center', gap:8 }}><span className="spinner" style={{ width:14,height:14,borderWidth:2 }}/>Recognizing...</span>
                      : '✅ Confirm Check In →'}
                  </button>
                )}
              </div>
            )}
            {ciResult?.action === 'check_in' && (
              <div className="fadein">
                <SuccessBanner emoji="✅" title="Checked In!" subtitle="Session started · Loading timer…"
                  badges={ciResult.recognized_user ? [
                    <span key="n" className="badge badge-green">👤 {ciResult.recognized_user.user_name}</span>,
                    <span key="c" className="badge badge-green">🎯 {(ciResult.recognized_user.confidence*100).toFixed(1)}%</span>,
                  ] : []} duration={2100} />
              </div>
            )}
          </div>
        </AnimCard>
      )}

      {/* ── SESSION ACTIVE + CHECK OUT ── */}
      {step === 'session' && (
        <AnimCard animKey={animKey}>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Live timer card */}
            <div className="card fadein" style={{
              border: `1px solid ${isAfterH ? 'var(--amber-b)' : 'var(--green-b)'}`,
              background: isAfterH ? 'var(--amber-bg)' : 'var(--green-bg)',
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:16 }}>
                <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{ width:52, height:52, borderRadius:'50%',
                    background: isAfterH ? 'var(--amber-bg)' : 'var(--green-bg)',
                    border: `2px solid ${isAfterH ? 'var(--amber)' : 'var(--green)'}`,
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>
                    {isAfterH ? '⚠️' : '🟢'}
                  </div>
                  <div>
                    <div style={{ fontWeight:800, fontSize:16, color: isAfterH ? 'var(--amber)' : 'var(--green)' }}>Session Active</div>
                    <div className="txt-muted" style={{ fontSize:13, marginTop:3 }}>
                      {session ? `Started at ${new Date(session.check_in).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}` : 'Session running'}
                    </div>
                  </div>
                </div>
                <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:40, fontWeight:900, letterSpacing:3,
                  color: isAfterH ? 'var(--amber)' : 'var(--green)' }}>
                  {fmt(elapsed)}
                </div>
              </div>
              <div style={{ marginTop:18 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--txt-4)', marginBottom:6 }}>
                  <span>Progress toward 8h</span><span>{Math.min(elapsed,8).toFixed(1)}h / 8h</span>
                </div>
                <div style={{ height:8, borderRadius:99, background:'var(--bg-3)', overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:99, transition:'width 1s linear', width:`${pct}%`,
                    background: isAfterH ? 'var(--amber)' : pct > 75 ? 'var(--green)' : 'var(--accent)' }} />
                </div>
                <div style={{ display:'flex', gap:8, marginTop:10, flexWrap:'wrap' }}>
                  <span className="badge badge-green">Regular: {fmt(Math.min(elapsed,REGULAR_HRS))}</span>
                  {isAfterH && <span className="badge badge-amber">⚠️ After Hours: {fmt(afterHrs)}</span>}
                  {elapsed >= 11 && <span className="badge badge-red">🚨 Auto-checkout at 12h!</span>}
                </div>
              </div>
            </div>

            {/* Check out card */}
            <div className="card fadein" style={{ border: coResult ? '1px solid var(--accent-border)' : '1px solid var(--red-b)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
                <div style={{ width:52, height:52, borderRadius:14, flexShrink:0,
                  background:'var(--red-bg)', border:'1px solid var(--red-b)',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>🚪</div>
                <div>
                  <div style={{ fontWeight:800, fontSize:17 }}>Check Out</div>
                  <div className="txt-muted" style={{ fontSize:13 }}>End your session and save your hours</div>
                </div>
              </div>
              {!coResult && (
                <div className="fadein" style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <CameraWidget captureLabel="Capture for Check Out"
                    onCapture={f => { setCoFile(f); setCoErr(''); }}
                    onCancel={() => { setCoFile(null); setCoErr(''); }} />
                  {coErr && <div className="alert alert-err">{coErr}</div>}
                  {coFile && (
                    <button className="btn" onClick={handleCheckOut} disabled={coLoad}
                      style={{ alignSelf:'flex-start', background:'var(--red-bg)', color:'var(--red)', borderColor:'var(--red-b)' }}>
                      {coLoad
                        ? <span style={{ display:'flex', alignItems:'center', gap:8 }}><span className="spinner" style={{ width:14,height:14,borderWidth:2 }}/>Recognizing...</span>
                        : '🚪 Confirm Check Out →'}
                    </button>
                  )}
                </div>
              )}
              {coResult?.action === 'check_out' && (
                <div className="fadein">
                  <SuccessBanner emoji="👋" title="Session Complete!" subtitle="Resetting for tomorrow…"
                    color="var(--accent)" bg="rgba(79,142,247,.06)" border="var(--accent-border)"
                    badges={coResult.attendance_record ? [
                      <span key="t" className="badge badge-blue">⏱ {coResult.attendance_record.session_duration_hours?.toFixed(2)}h total</span>,
                      <span key="r" className="badge badge-blue">✅ {coResult.attendance_record.regular_hours?.toFixed(2)}h regular</span>,
                      ...(coResult.attendance_record.after_hours > 0 ? [
                        <span key="a" className="badge badge-amber">🌙 {coResult.attendance_record.after_hours?.toFixed(2)}h after-hours</span>
                      ] : []),
                    ] : []} duration={2600} />
                </div>
              )}
            </div>
          </div>
        </AnimCard>
      )}

    </div>
  );
}