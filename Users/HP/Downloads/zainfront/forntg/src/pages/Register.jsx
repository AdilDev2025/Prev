import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { RiBrainLine } from 'react-icons/ri';
import {
  MdLightMode, MdDarkMode, MdArrowForward,
  MdEmail, MdLock, MdPerson, MdErrorOutline, MdCheckCircle,
} from 'react-icons/md';

// ── Animated background particles ─────────────────────────────────────────
function Particles() {
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    dur: Math.random() * 12 + 8,
    delay: Math.random() * 6,
    color: ['#4F8EF7', '#A855F7', '#22C55E', '#EC4899'][i % 4],
  }));

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {particles.map(p => (
        <motion.div
          key={p.id}
          animate={{
            y: [0, -40, 0],
            x: [0, Math.random() * 20 - 10, 0],
            opacity: [0.15, 0.5, 0.15],
            scale: [1, 1.3, 1],
          }}
          transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size,
            borderRadius: '50%',
            background: p.color,
            boxShadow: `0 0 ${p.size * 4}px ${p.color}`,
          }}
        />
      ))}
    </div>
  );
}

// ── Glowing orbs ──────────────────────────────────────────────────────────
function Orbs({ theme }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', width: 600, height: 600,
          top: '-20%', right: '-20%', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 65%)',
        }}
      />
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        style={{
          position: 'absolute', width: 500, height: 500,
          bottom: '-15%', left: '-15%', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79,142,247,0.10) 0%, transparent 65%)',
        }}
      />
    </div>
  );
}

// ── Theme Toggle ──────────────────────────────────────────────────────────
function ThemeToggle({ theme, toggleTheme }) {
  return (
    <motion.button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.93 }}
      style={{
        position: 'relative', width: 52, height: 28, borderRadius: 99,
        border: 'none', cursor: 'pointer', padding: 0, overflow: 'hidden',
        background: theme === 'dark'
          ? 'linear-gradient(135deg, #1a1035, #2d1f6e)'
          : 'linear-gradient(135deg, #74c0fc, #339af0)',
        boxShadow: theme === 'dark'
          ? '0 0 0 1px rgba(255,255,255,.08), 0 2px 12px rgba(109,68,248,.4)'
          : '0 0 0 1px rgba(0,0,0,.06), 0 2px 12px rgba(51,154,240,.35)',
      }}
    >
      {[{ top: 7, left: 8 }, { top: 14, left: 13 }, { top: 8, left: 20 }].map((s, i) => (
        <motion.span key={i}
          animate={{ opacity: theme === 'dark' ? 0.9 : 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'absolute', top: s.top, left: s.left,
            width: i === 2 ? 1.5 : 2, height: i === 2 ? 1.5 : 2,
            borderRadius: '50%', background: '#fff',
          }}
        />
      ))}
      <motion.div animate={{ opacity: theme === 'dark' ? 0 : 1 }} transition={{ duration: 0.3 }}
        style={{ position: 'absolute', top: 7, left: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <MdLightMode size={12} color="rgba(255,255,255,.9)" />
      </motion.div>
      <motion.div animate={{ opacity: theme === 'dark' ? 1 : 0 }} transition={{ duration: 0.3 }}
        style={{ position: 'absolute', top: 7, right: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <MdDarkMode size={12} color="rgba(200,180,255,.9)" />
      </motion.div>
      <motion.span
        animate={{ x: theme === 'dark' ? 26 : 3 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{
          position: 'absolute', top: 4, width: 20, height: 20, borderRadius: '50%',
          background: theme === 'dark'
            ? 'linear-gradient(135deg, #e8deff, #c4b3f5)'
            : 'linear-gradient(135deg, #fff5b8, #ffd43b)',
          boxShadow: theme === 'dark' ? '0 2px 8px rgba(0,0,0,.5)' : '0 2px 8px rgba(255,180,0,.5)',
        }}
      />
    </motion.button>
  );
}

// ── Password strength indicator ───────────────────────────────────────────
function PasswordStrength({ password }) {
  const getStrength = (p) => {
    if (!p) return { score: 0, label: '', color: 'transparent' };
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 1) return { score, label: 'Weak', color: '#ef4444' };
    if (score <= 3) return { score, label: 'Fair', color: '#f59e0b' };
    return { score, label: 'Strong', color: '#22C55E' };
  };

  const { score, label, color } = getStrength(password);
  if (!password) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      style={{ marginTop: -12, marginBottom: 16 }}
    >
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <motion.div key={i}
            animate={{ background: i <= score ? color : 'rgba(255,255,255,0.1)' }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
            style={{ flex: 1, height: 3, borderRadius: 2 }}
          />
        ))}
      </div>
      <span style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</span>
    </motion.div>
  );
}

// ── Clean Input ────────────────────────────────────────────────────────────
function FloatingInput({ label, type, placeholder, value, onChange, icon: Icon, required, autoFocus }) {
  const [focused, setFocused] = useState(false);
  const accentColor = '#A855F7';

  return (
    <div style={{ marginBottom: 18 }}>
      {/* Static label above */}
      <motion.label
        animate={{ color: focused ? accentColor : 'var(--txt-3)' }}
        transition={{ duration: 0.2 }}
        style={{
          display: 'block', marginBottom: 7,
          fontSize: 12, fontWeight: 700,
          letterSpacing: 0.5, textTransform: 'uppercase',
          pointerEvents: 'none',
        }}
      >
        {label}
      </motion.label>

      {/* Input wrapper */}
      <div style={{ position: 'relative' }}>
        {/* Icon */}
        <motion.div
          animate={{ color: focused ? accentColor : 'rgba(255,255,255,0.28)' }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'absolute', left: 13, top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex', alignItems: 'center',
            pointerEvents: 'none', zIndex: 2,
          }}
        >
          <Icon size={17} />
        </motion.div>

        {/* Focus ring */}
        <motion.div
          animate={{
            boxShadow: focused
              ? `0 0 0 3px ${accentColor}28`
              : '0 0 0 0px transparent',
          }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'absolute', inset: 0,
            borderRadius: 11, pointerEvents: 'none', zIndex: 0,
          }}
        />

        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '13px 14px 13px 40px',
            borderRadius: 11,
            border: `1.5px solid ${focused ? `${accentColor}66` : 'var(--border)'}`,
            background: focused ? 'rgba(168,85,247,0.05)' : 'rgba(255,255,255,0.04)',
            color: 'var(--txt)',
            fontSize: 14,
            fontFamily: 'Outfit, sans-serif',
            outline: 'none',
            transition: 'border-color 0.2s, background 0.2s',
            position: 'relative', zIndex: 1,
          }}
        />
      </div>
    </div>
  );
}

// ── Card tilt ─────────────────────────────────────────────────────────────
function TiltCard({ children }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], [3, -3]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-3, 3]);

  function handleMouse(e) {
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d', perspective: 1000 }}
    >
      {children}
    </motion.div>
  );
}

// ── Benefit badge ─────────────────────────────────────────────────────────
function BenefitBadge({ text, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '4px 10px', borderRadius: 20,
        background: `${color}12`, border: `1px solid ${color}28`,
        fontSize: 11, fontWeight: 600, color,
      }}
    >
      <MdCheckCircle size={12} /> {text}
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════
// REGISTER PAGE
// ════════════════════════════════════════════════════════════
export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (pass.length < 6) { setErr('Password must be at least 6 characters'); return; }
    setErr(''); setLoading(true);
    try {
      await register(name, email, pass);
      await login(email, pass);
      navigate('/dashboard');
    } catch (e) { setErr(e.message || 'Registration failed'); }
    finally { setLoading(false); }
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.96 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
  };

  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
  };

  const item = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      fontFamily: 'Outfit, sans-serif',
      background: 'var(--bg)', color: 'var(--txt)',
      position: 'relative', overflow: 'hidden',
    }}>
      <Orbs theme={theme} />
      <Particles />

      {/* Grid overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: `linear-gradient(rgba(168,85,247,.03) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(168,85,247,.03) 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
        maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%)',
      }} />

      {/* Topbar */}
      <motion.div
        initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          position: 'relative', zIndex: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 clamp(20px, 5vw, 48px)', height: 64,
        }}
      >
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }}
            style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'linear-gradient(135deg, #4F8EF7, #6D44F8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(79,142,247,.4)',
            }}>
            <RiBrainLine size={17} color="#fff" />
          </motion.div>
          <span style={{ fontWeight: 900, fontSize: 15, letterSpacing: 2, color: 'var(--txt)' }}>
            NEURO<em style={{ fontStyle: 'normal', color: 'var(--accent)' }}>FORCE</em>
          </span>
        </Link>
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      </motion.div>

      {/* Main */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 20px', position: 'relative', zIndex: 5,
      }}>
        <TiltCard>
          <motion.div
            variants={cardVariants} initial="hidden" animate="visible"
            style={{
              width: '100%', maxWidth: 440,
              background: theme === 'dark'
                ? 'rgba(10, 10, 20, 0.75)'
                : 'rgba(255,255,255,0.82)',
              backdropFilter: 'blur(24px)',
              border: '1px solid var(--border)',
              borderRadius: 24,
              padding: 'clamp(28px, 5vw, 44px)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05)',
              position: 'relative', overflow: 'hidden',
            }}
          >
            {/* Card inner glow — purple tint for register */}
            <div style={{
              position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
              width: 300, height: 200,
              background: 'radial-gradient(ellipse, rgba(168,85,247,0.12) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            <motion.div variants={stagger} initial="hidden" animate="visible">
              {/* Logo mark */}
              <motion.div variants={item}
                style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                <motion.div
                  whileHover={{ scale: 1.08 }}
                  style={{
                    width: 56, height: 56, borderRadius: 16,
                    background: 'linear-gradient(135deg, #A855F7 0%, #6D44F8 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 8px 32px rgba(168,85,247,0.45)',
                  }}>
                  <RiBrainLine size={26} color="#fff" />
                </motion.div>
              </motion.div>

              {/* Heading */}
              <motion.div variants={item} style={{ textAlign: 'center', marginBottom: 20 }}>
                <h1 style={{
                  fontSize: 26, fontWeight: 900, margin: '0 0 8px',
                  letterSpacing: -0.5, color: 'var(--txt)',
                }}>Create account</h1>
                <p style={{ fontSize: 14, color: 'var(--txt-4)', margin: '0 0 16px' }}>
                  Start managing your team with AI attendance
                </p>
                {/* Benefit badges */}
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <BenefitBadge text="Free forever" color="#22C55E" />
                  <BenefitBadge text="No credit card" color="#4F8EF7" />
                  <BenefitBadge text="Unlimited faces" color="#A855F7" />
                </div>
              </motion.div>

              {/* Error */}
              <AnimatePresence>
                {err && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: 'rgba(239,68,68,0.12)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: 10, padding: '10px 14px',
                      marginBottom: 20, color: '#f87171',
                      fontSize: 13, fontWeight: 500,
                    }}
                  >
                    <MdErrorOutline size={16} /> {err}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form */}
              <motion.div variants={item}>
                <form onSubmit={handleSubmit}>
                  <FloatingInput
                    label="Full Name" type="text"
                    placeholder="Ahmed Khan"
                    value={name} onChange={e => setName(e.target.value)}
                    icon={MdPerson} required autoFocus
                  />
                  <FloatingInput
                    label="Email address" type="email"
                    placeholder="you@company.com"
                    value={email} onChange={e => setEmail(e.target.value)}
                    icon={MdEmail} required
                  />
                  <FloatingInput
                    label="Password" type="password"
                    placeholder="Min 6 characters"
                    value={pass} onChange={e => setPass(e.target.value)}
                    icon={MdLock} required
                  />
                  <PasswordStrength password={pass} />

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={!loading ? { scale: 1.02, boxShadow: '0 0 32px rgba(168,85,247,0.5)' } : {}}
                    whileTap={!loading ? { scale: 0.98 } : {}}
                    style={{
                      width: '100%', marginTop: 8,
                      padding: '14px 0', borderRadius: 12,
                      border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                      background: loading
                        ? 'rgba(168,85,247,0.4)'
                        : 'linear-gradient(135deg, #A855F7 0%, #6D44F8 100%)',
                      color: '#fff', fontSize: 15, fontWeight: 800,
                      fontFamily: 'Outfit, sans-serif',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: '0 4px 20px rgba(168,85,247,0.3)',
                      transition: 'background 0.2s',
                    }}
                  >
                    {loading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                          style={{
                            width: 16, height: 16, borderRadius: '50%',
                            border: '2px solid rgba(255,255,255,0.3)',
                            borderTopColor: '#fff',
                          }}
                        />
                        Creating account...
                      </>
                    ) : (
                      <>Create Account <MdArrowForward size={18} /></>
                    )}
                  </motion.button>
                </form>
              </motion.div>

              {/* Divider */}
              <motion.div variants={item}
                style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: 12, color: 'var(--txt-4)', fontWeight: 500 }}>OR</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </motion.div>

              <motion.p variants={item}
                style={{ textAlign: 'center', fontSize: 14, color: 'var(--txt-3)', margin: 0 }}>
                Already have an account?{' '}
                <Link to="/login" style={{ color: '#A855F7', fontWeight: 700, textDecoration: 'none' }}>
                  Sign in
                </Link>
              </motion.p>
            </motion.div>
          </motion.div>
        </TiltCard>
      </div>
    </div>
  );
}