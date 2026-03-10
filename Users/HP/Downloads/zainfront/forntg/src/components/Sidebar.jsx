import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

// React Icons
import { MdDashboard, MdGroups, MdBarChart, MdLogout, MdFolder } from 'react-icons/md';
import { RiArrowLeftSLine, RiFlashlightFill } from 'react-icons/ri';
import { HiOutlineClock } from 'react-icons/hi2';
import { TbLayoutDashboard } from 'react-icons/tb';
import { WiDaySunny } from 'react-icons/wi';
import { BsMoonStarsFill } from 'react-icons/bs';

export default function Sidebar({ isWorkspace, workspaceName, activeTab, onTabChange, isAdmin, isOpen, onClose }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  function go(path) { navigate(path); onClose?.(); }
  function tab(t) { onTabChange?.(t); onClose?.(); }

  const wsTabs = isAdmin
    ? [
        { k: 'overview',     Icon: TbLayoutDashboard, l: 'Overview' },
        { k: 'attendance',   Icon: HiOutlineClock,    l: 'Attendance' },
        { k: 'members',      Icon: MdGroups,          l: 'Members' },
        { k: 'productivity', Icon: MdBarChart,        l: 'Productivity' },
      ]
    : [
        { k: 'overview',     Icon: TbLayoutDashboard, l: 'Overview' },
        { k: 'attendance',   Icon: HiOutlineClock,    l: 'Attendance' },
        { k: 'productivity', Icon: MdBarChart,        l: 'Productivity' },
      ];

  const sidebarVariants = {
    hidden: { x: -280, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } },
    exit:   { x: -280, opacity: 0, transition: { duration: 0.2 } },
  };

  const itemVariants = {
    hidden:  { x: -16, opacity: 0 },
    visible: (i) => ({ x: 0, opacity: 1, transition: { delay: i * 0.05, type: 'spring', stiffness: 300, damping: 24 } }),
  };

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="sidebar-overlay open"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={`sidebar ${isOpen ? 'open' : ''}`}
        variants={sidebarVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo */}
        <motion.div
          className="sb-logo"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <motion.div
            className="sb-logo-mark"
            whileHover={{ rotate: 20, scale: 1.15 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <RiFlashlightFill size={20} />
          </motion.div>
          <div className="sb-logo-text">NEURO<em>FORCE</em></div>
        </motion.div>

        {/* Nav */}
        <nav className="sb-nav">
          {!isWorkspace ? (
            <>
              <span className="sb-label">Main</span>
              <motion.button
                className="sb-item active"
                custom={0}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.97 }}
              >
                <MdDashboard size={18} className="sb-ico" /> Dashboard
              </motion.button>
            </>
          ) : (
            <>
              <span className="sb-label">Navigation</span>
              <motion.button
                className="sb-item"
                onClick={() => go('/dashboard')}
                custom={0}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.97 }}
              >
                <RiArrowLeftSLine size={18} className="sb-ico" /> All Workspaces
              </motion.button>

              <span className="sb-label">Workspace</span>
              {wsTabs.map(({ k, Icon, l }, i) => (
                <motion.button
                  key={k}
                  className={`sb-item ${activeTab === k ? 'active' : ''}`}
                  onClick={() => tab(k)}
                  custom={i + 1}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Icon size={18} className="sb-ico" /> {l}

                  {/* Active indicator pill */}
                  <AnimatePresence>
                    {activeTab === k && (
                      <motion.span
                        layoutId="active-pill"
                        style={{
                          position: 'absolute',
                          right: 10,
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: 'var(--accent)',
                        }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      />
                    )}
                  </AnimatePresence>
                </motion.button>
              ))}
            </>
          )}

          <div style={{ flex: 1 }} />

          {/* Theme Switch
          <div style={{ padding: '0 12px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <WiDaySunny size={18} style={{ color: 'var(--txt-4)', flexShrink: 0 }} />
            <motion.button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              role="switch"
              aria-checked={theme === 'dark'}
              style={{
                position: 'relative',
                width: 44,
                height: 24,
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                flexShrink: 0,
                background: theme === 'dark'
                  ? 'linear-gradient(135deg, #1e1b4b, #312e81)'
                  : 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
                boxShadow: theme === 'dark'
                  ? '0 0 10px rgba(99,102,241,0.4)'
                  : '0 0 10px rgba(14,165,233,0.35)',
                transition: 'background 0.4s ease, box-shadow 0.4s ease',
              }}
              whileTap={{ scale: 0.92 }}
            >
              <motion.span
                layout
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                style={{
                  position: 'absolute',
                  top: 3,
                  left: theme === 'dark' ? 23 : 3,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: theme === 'dark'
                    ? 'linear-gradient(135deg, #e0e7ff, #c7d2fe)'
                    : 'linear-gradient(135deg, #fef08a, #fbbf24)',
                  boxShadow: theme === 'dark'
                    ? '0 1px 4px rgba(0,0,0,0.5)'
                    : '0 1px 6px rgba(251,191,36,0.6)',
                  transition: 'left 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                }}
              />
            </motion.button>
            <BsMoonStarsFill size={13} style={{ color: 'var(--txt-4)', flexShrink: 0 }} />
          </div> */}
        </nav>

        {/* Footer */}
        <motion.div
          className="sb-foot"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          {isWorkspace && workspaceName && (
            <div style={{
              fontSize: 11, color: 'var(--txt-4)', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '.5px',
              padding: '2px 12px 10px', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <MdFolder size={13} /> {workspaceName}
            </div>
          )}

          <div className="sb-user">
            <motion.div
              className="sb-avatar"
              whileHover={{ scale: 1.08 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              {initials}
            </motion.div>
            <div className="sb-uinfo">
              <div className="sb-uname">{user?.name}</div>
              <div className="sb-urole">{user?.role}</div>
            </div>
          </div>

          <motion.button
            className="btn btn-sm btn-block"
            style={{ justifyContent: 'center', gap: 8 }}
            onClick={() => { logout(); navigate('/login'); }}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.96 }}
          >
            <MdLogout size={16} /> Sign Out
          </motion.button>
        </motion.div>
      </motion.aside>
    </>
  );
}