import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import {
  motion, useScroll, useTransform, useMotionValue,
  useSpring, AnimatePresence, useInView,
} from 'framer-motion';
import {
  MdFaceRetouchingNatural, MdDashboardCustomize, MdCorporateFare,
  MdAutoGraph, MdBolt, MdSecurity, MdArrowForward, MdStar,
  MdLightMode, MdDarkMode, MdCheck,
} from 'react-icons/md';
import { RiBrainLine, RiShieldCheckLine, RiTimeLine, RiTeamLine } from 'react-icons/ri';
import { Chip, Tooltip } from '@mui/material';


// ─── Data ──────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: MdFaceRetouchingNatural, title: 'AI Face Recognition',  desc: 'DLIB + Qdrant vector search. 128-D embeddings ensure reliable, fraud-proof check-ins at <500ms.', color: '#4F8EF7' },
  { icon: MdDashboardCustomize,    title: 'Smart Dashboards',      desc: "Real-time admin views: who's present, session durations, after-hours tracking, attendance rates.", color: '#A855F7' },
  { icon: MdCorporateFare,         title: 'Multi-Workspace',       desc: 'Create unlimited workspaces. Invite members via email, assign roles, and manage each team independently.', color: '#22C55E' },
  { icon: MdAutoGraph,             title: 'Productivity Scoring',  desc: 'Auto-calculated scores from attendance confidence, reliability coefficients, and after-hours contributions.', color: '#F59E0B' },
  { icon: MdBolt,                  title: 'Instant Check-in',      desc: 'Walk up, face the camera, session started. No cards, no PINs — just your face as your ID.', color: '#EC4899' },
  { icon: MdSecurity,              title: 'Role-Based Access',     desc: 'Admins see everything. Employees see only their data. Secure JWT auth with 24h expiry.', color: '#06B6D4' },
];

const STEPS = [
  { num: '01', icon: MdCorporateFare,         title: 'Create Workspace',  desc: 'Set up your org workspace and invite team members via email with role assignment.',              color: '#4F8EF7' },
  { num: '02', icon: MdFaceRetouchingNatural, title: 'Register Faces',    desc: 'Employees scan their face once. The AI stores biometric embeddings in Qdrant vector DB.',         color: '#A855F7' },
  { num: '03', icon: MdBolt,                  title: 'Daily Check-ins',   desc: 'Facial recognition in <500ms. Session timer starts automatically with after-hours tracking.',      color: '#22C55E' },
  { num: '04', icon: MdAutoGraph,             title: 'Track & Score',     desc: 'Live dashboards show presence, history, and AI-calculated productivity scores.',                   color: '#F59E0B' },
];

const STATS = [
  { value: '<500ms', label: 'Recognition Speed', icon: RiTimeLine,      color: '#4F8EF7' },
  { value: '99.2%',  label: 'Accuracy Rate',     icon: RiShieldCheckLine, color: '#22C55E' },
  { value: '∞',      label: 'Workspaces',         icon: RiTeamLine,      color: '#A855F7' },
  { value: 'Live',   label: 'Dashboards',         icon: RiBrainLine,     color: '#F59E0B' },
];

// ─── Animation variants ────────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 32, filter: 'blur(6px)' },
  visible: { opacity: 1, y: 0,  filter: 'blur(0px)',
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

// ─── Animated counter ─────────────────────────────────────────────────────
function CountUp({ value }) {
  // Just display as-is; pure text values like "<500ms" don't need counting
  return <span>{value}</span>;
}

// ─── Section wrapper with scroll-triggered reveal ─────────────────────────
function RevealSection({ children, className, style }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div ref={ref} initial="hidden" animate={inView ? 'visible' : 'hidden'}
      variants={stagger} className={className} style={style}>
      {children}
    </motion.div>
  );
}

// ─── Floating orb background ──────────────────────────────────────────────
function FloatingOrbs() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {[
        { w: 500, h: 500, top: '-15%', left: '-10%',  color: 'rgba(79,142,247,.12)',  dur: 18 },
        { w: 400, h: 400, top: '20%',  right: '-8%',  color: 'rgba(168,85,247,.10)',  dur: 22 },
        { w: 300, h: 300, bottom: '5%',left: '30%',   color: 'rgba(34,197,94,.08)',   dur: 15 },
      ].map((orb, i) => (
        <motion.div key={i}
          animate={{ y: [0, -30, 0], x: [0, 15, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: orb.dur, repeat: Infinity, ease: 'easeInOut', delay: i * 3 }}
          style={{
            position: 'absolute', width: orb.w, height: orb.h,
            top: orb.top, left: orb.left, right: orb.right, bottom: orb.bottom,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
            filter: 'blur(1px)',
          }}
        />
      ))}
    </div>
  );
}

// ─── Navbar ────────────────────────────────────────────────────────────────
function Navbar({ theme, toggleTheme }) {
  const { scrollY } = useScroll();
  const blur = useTransform(scrollY, [0, 80], [0, 16]);
  const bg   = useTransform(scrollY, [0, 80], ['rgba(0,0,0,0)', 'rgba(var(--bg-rgb,6,8,16),.85)']);

  return (
    <motion.nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 clamp(20px, 5vw, 64px)',
      height: 64,
      backdropFilter: `blur(${blur}px)`,
      background: bg,
      borderBottom: '1px solid rgba(255,255,255,.04)',
    }}>
      {/* Logo */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <motion.div
          whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }}
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #4F8EF7 0%, #6D44F8 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(79,142,247,.4)',
          }}>
          <RiBrainLine size={18} color="#fff" />
        </motion.div>
        <span style={{
          fontWeight: 900, fontSize: 16, letterSpacing: 2,
          color: 'var(--txt)', fontFamily: 'Outfit, sans-serif',
        }}>
          NEURO<em style={{ fontStyle: 'normal', color: 'var(--accent)' }}>FORCE</em>
        </span>
      </motion.div>

      {/* Nav right */}
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

        {/* Theme toggle */}
        <motion.button onClick={toggleTheme} aria-label="Toggle theme"
  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }}
  style={{
    position: 'relative', width: 52, height: 28, borderRadius: 99,
    border: 'none', cursor: 'pointer', padding: 0,
    background: theme === 'dark'
      ? 'linear-gradient(135deg, #1a1035, #2d1f6e)'
      : 'linear-gradient(135deg, #74c0fc, #339af0)',
    boxShadow: theme === 'dark'
      ? '0 0 0 1px rgba(255,255,255,.08), 0 2px 12px rgba(109,68,248,.4)'
      : '0 0 0 1px rgba(0,0,0,.06), 0 2px 12px rgba(51,154,240,.35)',
    overflow: 'hidden',
  }}>

  {/* Stars (dark mode) */}
  {[{ top: 7, left: 8 }, { top: 14, left: 13 }, { top: 8, left: 20 }].map((s, i) => (
    <motion.span key={i}
      animate={{ opacity: theme === 'dark' ? 0.9 : 0 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'absolute', top: s.top, left: s.left,
        width: i === 2 ? 1.5 : 2, height: i === 2 ? 1.5 : 2,
        borderRadius: '50%', background: '#fff',
      }} />
  ))}

  {/* Sun icon (light mode) */}
  <motion.div
    animate={{ opacity: theme === 'dark' ? 0 : 1 }}
    transition={{ duration: 0.3 }}
    style={{ position: 'absolute', top: 7, left: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <MdLightMode size={12} color="rgba(255,255,255,.9)" />
  </motion.div>

  {/* Moon icon (dark mode) */}
  <motion.div
    animate={{ opacity: theme === 'dark' ? 1 : 0 }}
    transition={{ duration: 0.3 }}
    style={{ position: 'absolute', top: 7, right: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <MdDarkMode size={12} color="rgba(200,180,255,.9)" />
  </motion.div>

  {/* Thumb */}
  <motion.span
    animate={{ x: theme === 'dark' ? 26 : 3 }}
    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    style={{
      position: 'absolute', top: 4, width: 20, height: 20,
      borderRadius: '50%',
      background: theme === 'dark'
        ? 'linear-gradient(135deg, #e8deff, #c4b3f5)'
        : 'linear-gradient(135deg, #fff5b8, #ffd43b)',
      boxShadow: theme === 'dark'
        ? '0 2px 8px rgba(0,0,0,.5)'
        : '0 2px 8px rgba(255,180,0,.5)',
    }} />
</motion.button>

        <Link to="/login">
          <motion.span whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            style={{
              display: 'inline-block', padding: '8px 18px', borderRadius: 10,
              border: '1px solid var(--border)', color: 'var(--txt-3)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: 'rgba(255,255,255,.04)',
            }}>Sign In</motion.span>
        </Link>

        <Link to="/register">
          <motion.span whileHover={{ scale: 1.03, boxShadow: '0 0 24px rgba(79,142,247,.4)' }}
            whileTap={{ scale: 0.97 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 18px', borderRadius: 10,
              background: 'linear-gradient(135deg, #4F8EF7, #6D44F8)',
              color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}>
            Get Started <MdArrowForward size={14} />
          </motion.span>
        </Link>
      </motion.div>
    </motion.nav>
  );
}

// ─── Feature card ──────────────────────────────────────────────────────────
function FeatureCard({ feature, index }) {
  const Icon = feature.icon;
  return (
    <motion.div variants={fadeUp}
      whileHover={{ y: -6, boxShadow: `0 20px 56px ${feature.color}18`, borderColor: `${feature.color}40`, transition: { duration: 0.22 } }}
      style={{
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        borderRadius: 20, padding: '28px 26px', cursor: 'default',
        position: 'relative', overflow: 'hidden',
      }}>
      {/* Corner glow */}
      <div style={{
        position: 'absolute', top: -40, right: -40, width: 120, height: 120,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${feature.color}18 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <motion.div
        whileHover={{ scale: 1.1, rotate: 5 }} transition={{ type: 'spring', stiffness: 300 }}
        style={{
          width: 50, height: 50, borderRadius: 14, marginBottom: 18,
          background: `${feature.color}14`, border: `1px solid ${feature.color}28`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
        <Icon size={24} color={feature.color} />
      </motion.div>

      <h3 style={{ fontWeight: 800, fontSize: 16, color: 'var(--txt)', margin: '0 0 10px' }}>
        {feature.title}
      </h3>
      <p style={{ fontSize: 13, color: 'var(--txt-4)', lineHeight: 1.75, margin: 0 }}>
        {feature.desc}
      </p>
    </motion.div>
  );
}

// ─── Step card ─────────────────────────────────────────────────────────────
function StepCard({ step, index, total }) {
  const Icon = step.icon;
  return (
    <motion.div variants={fadeUp}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', position: 'relative' }}>
      {/* Connector line */}
      {index < total - 1 && (
        <div style={{
          position: 'absolute', top: 24, left: 80,
          right: -32, height: 1,
          background: `linear-gradient(90deg, ${step.color}60, transparent)`,
          pointerEvents: 'none',
        }} />
      )}

      <div style={{
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        borderRadius: 20, padding: '26px 22px', width: '100%',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Step number watermark */}
        <div style={{
          position: 'absolute', bottom: -10, right: 10,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 72, fontWeight: 900, color: `${step.color}08`,
          lineHeight: 1, userSelect: 'none', pointerEvents: 'none',
        }}>{step.num}</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 13, flexShrink: 0,
            background: `${step.color}14`, border: `1px solid ${step.color}28`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={22} color={step.color} />
          </div>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
            fontWeight: 900, color: step.color, letterSpacing: 1,
          }}>{step.num}</span>
        </div>

        <h3 style={{ fontWeight: 800, fontSize: 15, color: 'var(--txt)', margin: '0 0 8px' }}>
          {step.title}
        </h3>
        <p style={{ fontSize: 13, color: 'var(--txt-4)', lineHeight: 1.7, margin: 0 }}>
          {step.desc}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Stat pill ─────────────────────────────────────────────────────────────
function StatPill({ stat }) {
  const Icon = stat.icon;
  return (
    <motion.div variants={fadeUp}
      whileHover={{ scale: 1.04, y: -2 }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        borderRadius: 18, padding: '22px 28px', flex: 1, minWidth: 120,
      }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: `${stat.color}14`, border: `1px solid ${stat.color}28`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={20} color={stat.color} />
      </div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 26, fontWeight: 900, color: stat.color }}>
        {stat.value}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt-4)', letterSpacing: .6, textTransform: 'uppercase' }}>
        {stat.label}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
export default function Landing() {
  const { theme, toggleTheme } = useTheme();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY   = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const heroO   = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  const sectionStyle = {
    padding: 'clamp(64px, 8vw, 120px) clamp(20px, 6vw, 100px)',
    position: 'relative',
  };

  return (
    <div style={{ fontFamily: 'Outfit, sans-serif', background: 'var(--bg)', color: 'var(--txt)', overflowX: 'hidden' }}>
      <Navbar theme={theme} toggleTheme={toggleTheme} />

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section ref={heroRef} style={{
        ...sectionStyle,
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        paddingTop: 120,
      }}>
        <FloatingOrbs />

        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          backgroundImage: `linear-gradient(rgba(79,142,247,.04) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(79,142,247,.04) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
        }} />

        <motion.div style={{ y: heroY, opacity: heroO, position: 'relative', zIndex: 1, maxWidth: 780 }}>
          {/* Kicker chip */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
            <Chip
              icon={<RiBrainLine size={14} color="#4F8EF7" />}
              label="AI-Powered Workforce Intelligence"
              sx={{
                bgcolor: 'rgba(79,142,247,.1)', color: '#4F8EF7',
                border: '1px solid rgba(79,142,247,.25)',
                fontWeight: 700, fontSize: 12, height: 32,
                '& .MuiChip-icon': { color: '#4F8EF7' },
              }}
            />
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontSize: 'clamp(40px, 7vw, 78px)', fontWeight: 900, lineHeight: 1.08,
              margin: '0 0 24px', letterSpacing: -2,
              color: 'var(--txt)',
            }}>
            Attendance that
            <br />
            <motion.span
              initial={{ backgroundSize: '0% 100%' }}
              animate={{ backgroundSize: '100% 100%' }}
              transition={{ duration: 1, delay: 0.8, ease: 'easeOut' }}
              style={{
                backgroundImage: 'linear-gradient(135deg, #4F8EF7 0%, #A855F7 50%, #EC4899 100%)',
                backgroundClip: 'text', WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent', backgroundRepeat: 'no-repeat',
              }}>
              thinks for itself.
            </motion.span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            style={{
              fontSize: 'clamp(15px, 2vw, 19px)', color: 'var(--txt-4)',
              lineHeight: 1.75, margin: '0 auto 40px', maxWidth: 560,
            }}>
            NEURO-FORCE uses facial recognition AI to automate check-ins,
            measure productivity, and give managers unprecedented workforce visibility.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 56 }}>
            <Link to="/register">
              <motion.span
                whileHover={{ scale: 1.04, boxShadow: '0 0 32px rgba(79,142,247,.5)' }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '14px 28px', borderRadius: 14,
                  background: 'linear-gradient(135deg, #4F8EF7 0%, #6D44F8 100%)',
                  color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer',
                  boxShadow: '0 4px 24px rgba(79,142,247,.3)',
                }}>
                Start Free <MdArrowForward size={18} />
              </motion.span>
            </Link>
            <Link to="/login">
              <motion.span
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                style={{
                  display: 'inline-block', padding: '14px 28px', borderRadius: 14,
                  border: '1px solid var(--border)', color: 'var(--txt-3)',
                  fontWeight: 700, fontSize: 15, cursor: 'pointer',
                  background: 'rgba(255,255,255,.04)', backdropFilter: 'blur(8px)',
                }}>
                Sign In
              </motion.span>
            </Link>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            variants={stagger}
            style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            {STATS.map(s => <StatPill key={s.label} stat={s} />)}
          </motion.div>
        </motion.div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────── */}
      <section style={{ ...sectionStyle, background: 'var(--bg-2)', borderTop: '1px solid var(--border)' }}>
        <RevealSection>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 56 }}>
            <Chip label="Platform Features" size="small" sx={{
              bgcolor: 'rgba(168,85,247,.1)', color: '#A855F7',
              border: '1px solid rgba(168,85,247,.25)', fontWeight: 700, fontSize: 11,
              height: 28, mb: 2,
            }} />
            <h2 style={{
              fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 900, margin: '12px 0 16px',
              letterSpacing: -1, color: 'var(--txt)',
            }}>
              Everything your team needs
            </h2>
            <p style={{ color: 'var(--txt-4)', fontSize: 15, maxWidth: 480, margin: '0 auto' }}>
              One platform to register faces, track attendance, and measure productivity.
            </p>
          </motion.div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 18,
          }}>
            {FEATURES.map((f, i) => <FeatureCard key={f.title} feature={f} index={i} />)}
          </div>
        </RevealSection>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────── */}
      <section style={{ ...sectionStyle }}>
        <RevealSection>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 56 }}>
            <Chip label="How It Works" size="small" sx={{
              bgcolor: 'rgba(34,197,94,.1)', color: '#22C55E',
              border: '1px solid rgba(34,197,94,.25)', fontWeight: 700, fontSize: 11,
              height: 28, mb: 2,
            }} />
            <h2 style={{
              fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 900, margin: '12px 0 16px',
              letterSpacing: -1, color: 'var(--txt)',
            }}>
              Up in minutes, not days
            </h2>
            <p style={{ color: 'var(--txt-4)', fontSize: 15, maxWidth: 480, margin: '0 auto' }}>
              Four steps from zero to fully automated attendance tracking.
            </p>
          </motion.div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 18,
          }}>
            {STEPS.map((s, i) => <StepCard key={s.num} step={s} index={i} total={STEPS.length} />)}
          </div>
        </RevealSection>
      </section>

      {/* ── CTA BANNER ──────────────────────────────────────────────── */}
      <section style={{
        ...sectionStyle, textAlign: 'center',
        background: 'var(--bg-2)', borderTop: '1px solid var(--border)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Radial glow */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 60% 80% at 50% 50%, rgba(79,142,247,.08) 0%, transparent 70%)',
        }} />

        <RevealSection style={{ position: 'relative', zIndex: 1 }}>
          <motion.div variants={fadeUp}>
            <Chip label="Get Started" size="small" sx={{
              bgcolor: 'rgba(79,142,247,.1)', color: '#4F8EF7',
              border: '1px solid rgba(79,142,247,.25)', fontWeight: 700, fontSize: 11, height: 28, mb: 2,
            }} />
          </motion.div>

          <motion.h2 variants={fadeUp} style={{
            fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 900,
            margin: '12px 0 16px', letterSpacing: -1, color: 'var(--txt)',
          }}>
            Ready to modernize?
          </motion.h2>

          <motion.p variants={fadeUp} style={{
            color: 'var(--txt-4)', maxWidth: 440, margin: '0 auto 16px', fontSize: 15, lineHeight: 1.75,
          }}>
            Join teams eliminating manual attendance tracking with AI.
          </motion.p>

          {/* Feature checkmarks */}
          <motion.div variants={fadeUp}
            style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 36 }}>
            {['No credit card required', 'Unlimited faces', 'Real-time dashboards'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--txt-3)' }}>
                <MdCheck size={16} color="#22C55E" /> {f}
              </div>
            ))}
          </motion.div>

          <motion.div variants={fadeUp}
            style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register">
              <motion.span
                whileHover={{ scale: 1.04, boxShadow: '0 0 32px rgba(79,142,247,.45)' }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '14px 28px', borderRadius: 14,
                  background: 'linear-gradient(135deg, #4F8EF7, #6D44F8)',
                  color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer',
                  boxShadow: '0 4px 24px rgba(79,142,247,.3)',
                }}>
                Create Free Account <MdArrowForward size={18} />
              </motion.span>
            </Link>
            <Link to="/login">
              <motion.span whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                style={{
                  display: 'inline-block', padding: '14px 28px', borderRadius: 14,
                  border: '1px solid var(--border)', color: 'var(--txt-3)',
                  fontWeight: 700, fontSize: 15, cursor: 'pointer',
                  background: 'rgba(255,255,255,.04)',
                }}>
                Sign In
              </motion.span>
            </Link>
          </motion.div>
        </RevealSection>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer style={{
        padding: '32px clamp(20px, 6vw, 100px)',
        borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16,
        background: 'var(--bg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'linear-gradient(135deg, #4F8EF7, #6D44F8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <RiBrainLine size={15} color="#fff" />
          </div>
          <span style={{ fontWeight: 900, fontSize: 14, letterSpacing: 2, color: 'var(--txt)' }}>
            NEURO<em style={{ fontStyle: 'normal', color: 'var(--accent)' }}>FORCE</em>
          </span>
        </div>

        <p style={{ fontSize: 12, color: 'var(--txt-4)', margin: 0 }}>
          © {new Date().getFullYear()} NEURO-FORCE. AI-powered workforce management.
        </p>

        <div style={{ display: 'flex', gap: 20 }}>
          {[['Sign In', '/login'], ['Register', '/register']].map(([label, to]) => (
            <Link key={label} to={to}>
              <motion.span whileHover={{ color: 'var(--accent)' }}
                style={{ fontSize: 13, color: 'var(--txt-4)', display: 'block', transition: 'color .2s' }}>
                {label}
              </motion.span>
            </Link>
          ))}
        </div>
      </footer>
    </div>
  );
}