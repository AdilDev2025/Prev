import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { workspaceApi } from '../../api/client';

// Inline Alert (no shadcn/ui dependency)
const Alert = ({ children, style }) => (
  <div style={{ borderRadius: 10, padding: '10px 14px', fontSize: 13, ...style }}>{children}</div>
);
const AlertDescription = ({ children, style }) => (
  <span style={style}>{children}</span>
);

// MUI
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Typography,
  Paper,
  Stack,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#6366f1' },
    background: { paper: '#0f0f13', default: '#07070a' },
    text: { primary: '#f1f0ff', secondary: '#8b8aab' },
  },
  typography: {
    fontFamily: '"DM Sans", "Helvetica Neue", sans-serif',
  },
  shape: { borderRadius: 14 },
  components: {
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            background: 'rgba(255,255,255,0.04)',
            '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
            '&:hover fieldset': { borderColor: 'rgba(99,102,241,0.5)' },
            '&.Mui-focused fieldset': { borderColor: '#6366f1' },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          background: 'rgba(255,255,255,0.04)',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(99,102,241,0.5)' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#6366f1' },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          letterSpacing: '0.01em',
          borderRadius: 10,
          padding: '10px 20px',
        },
      },
    },
  },
});

// Subtle animated background blob
function BackdropBlob() {
  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 998,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    />
  );
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.22 } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
};

const modalVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring', stiffness: 320, damping: 28, delay: 0.04 },
  },
  exit: { opacity: 0, y: 16, scale: 0.97, transition: { duration: 0.16 } },
};

const contentVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.24, delay: 0.08 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

export default function InviteModal({ workspaceId, onClose }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');

  const theme = useTheme();
  const isMobile = useMediaQuery('(max-width:600px)');

  async function handleSend(e) {
    e.preventDefault();
    setLoading(true); setErr(''); setResult(null);
    try {
      const r = await workspaceApi.invite(workspaceId, email, role);
      setResult(r);
      setEmail('');
    } catch (ex) {
      setErr(ex.message || 'Failed to send invite');
    } finally {
      setLoading(false);
    }
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <ThemeProvider theme={darkTheme}>
      <AnimatePresence>
        <motion.div
          key="backdrop"
          variants={overlayVariants}
          initial="hidden" animate="visible" exit="exit"
          style={{ position: 'fixed', inset: 0, zIndex: 998 }}
          onClick={onClose}
        >
          <BackdropBlob />
        </motion.div>

        <Box
          sx={{
            position: 'fixed', inset: 0,
            zIndex: 999,
            display: 'flex',
            alignItems: isMobile ? 'flex-end' : 'center',
            justifyContent: 'center',
            p: isMobile ? 0 : 2,
            pointerEvents: 'none',
          }}
        >
          <motion.div
            key="modal"
            variants={modalVariants}
            initial="hidden" animate="visible" exit="exit"
            style={{ width: '100%', maxWidth: 480, pointerEvents: 'auto' }}
          >
            <Paper
              elevation={0}
              onClick={(e) => e.stopPropagation()}
              sx={{
                width: '100%',
                borderRadius: isMobile ? '20px 20px 0 0' : '18px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'linear-gradient(145deg, #111118 0%, #0d0d14 100%)',
                boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.12)',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {/* Top accent line */}
              <Box sx={{
                height: 2,
                background: 'linear-gradient(90deg, transparent, #6366f1, #818cf8, transparent)',
                opacity: 0.7,
              }} />

              {/* Ambient glow */}
              <Box sx={{
                position: 'absolute', top: -60, right: -40,
                width: 200, height: 200,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
                pointerEvents: 'none',
              }} />

              <Box sx={{ p: { xs: 3, sm: 4 } }}>
                {/* Header */}
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
                  <Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 800,
                        fontSize: { xs: 18, sm: 20 },
                        color: '#f1f0ff',
                        letterSpacing: '-0.02em',
                        lineHeight: 1.2,
                      }}
                    >
                      Invite Member
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6b6a8a', mt: 0.4, fontSize: 13 }}>
                      Send an invite to your workspace
                    </Typography>
                  </Box>
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={onClose}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      color: '#8b8aab',
                      cursor: 'pointer',
                      padding: '6px 14px',
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: 'inherit',
                      letterSpacing: '0.01em',
                      flexShrink: 0,
                      marginLeft: 12,
                    }}
                  >
                    Close
                  </motion.button>
                </Stack>

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 3 }} />

                {/* Error alert */}
                <AnimatePresence>
                  {err && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}
                      style={{ marginBottom: 16 }}
                    >
                      <Alert
                        style={{
                          background: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.25)',
                          color: '#fca5a5',
                        }}
                      >
                        <AlertDescription>{err}</AlertDescription>
                      </Alert>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Content */}
                <AnimatePresence mode="wait">
                  {result ? (
                    <motion.div
                      key="result"
                      variants={contentVariants}
                      initial="hidden" animate="visible" exit="exit"
                    >
                      <Box
                        sx={{
                          borderRadius: 3,
                          p: 2.5,
                          mb: 2,
                          background: result.emailSent
                            ? 'rgba(34,197,94,0.08)'
                            : 'rgba(234,179,8,0.08)',
                          border: `1px solid ${result.emailSent ? 'rgba(34,197,94,0.2)' : 'rgba(234,179,8,0.2)'}`,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: result.emailSent ? '#86efac' : '#fde047',
                          }}
                        >
                          {result.emailSent
                            ? 'Invite email sent successfully'
                            : 'Email delivery failed — share the invite ID below'}
                        </Typography>
                      </Box>

                      {!result.emailSent && result.invite?.id && (
                        <Box
                          sx={{
                            borderRadius: 3,
                            p: 2.5,
                            mb: 2.5,
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{ color: '#6b6a8a', display: 'block', mb: 1, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 10 }}
                          >
                            Invite ID
                          </Typography>
                          <Typography
                            component="code"
                            sx={{
                              fontSize: 12,
                              wordBreak: 'break-all',
                              color: '#a5b4fc',
                              fontFamily: '"JetBrains Mono", monospace',
                              display: 'block',
                              lineHeight: 1.6,
                            }}
                          >
                            {result.invite.id}
                          </Typography>
                        </Box>
                      )}

                      <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          fullWidth
                          variant="contained"
                          onClick={() => setResult(null)}
                          sx={{
                            background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
                            boxShadow: '0 4px 20px rgba(99,102,241,0.3)',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #7072f3 0%, #8f97fa 100%)',
                              boxShadow: '0 6px 24px rgba(99,102,241,0.4)',
                            },
                          }}
                        >
                          Invite Another
                        </Button>
                      </motion.div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="form"
                      variants={contentVariants}
                      initial="hidden" animate="visible" exit="exit"
                    >
                      <Box component="form" onSubmit={handleSend}>
                        <Stack spacing={2.5}>
                          <TextField
                            type="email"
                            label="Email address"
                            placeholder="colleague@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoFocus
                            fullWidth
                            size="medium"
                            InputLabelProps={{ style: { color: '#6b6a8a', fontSize: 14 } }}
                            inputProps={{ style: { color: '#f1f0ff', fontSize: 14 } }}
                          />

                          <FormControl fullWidth size="medium">
                            <InputLabel sx={{ color: '#6b6a8a', fontSize: 14 }}>Role</InputLabel>
                            <Select
                              value={role}
                              label="Role"
                              onChange={(e) => setRole(e.target.value)}
                              sx={{ color: '#f1f0ff', fontSize: 14 }}
                              MenuProps={{
                                PaperProps: {
                                  sx: {
                                    background: '#14141e',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: 2,
                                    mt: 0.5,
                                  },
                                },
                              }}
                            >
                              <MenuItem value="user" sx={{ fontSize: 14 }}>Employee (user)</MenuItem>
                              
                            </Select>
                          </FormControl>

                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} pt={0.5}>
                            <motion.div style={{ flex: 1 }} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                              <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                disabled={loading}
                                sx={{
                                  background: loading
                                    ? 'rgba(99,102,241,0.4)'
                                    : 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
                                  boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.3)',
                                  '&:hover': {
                                    background: 'linear-gradient(135deg, #7072f3 0%, #8f97fa 100%)',
                                    boxShadow: '0 6px 24px rgba(99,102,241,0.4)',
                                  },
                                  '&.Mui-disabled': {
                                    color: 'rgba(255,255,255,0.4)',
                                  },
                                  height: 44,
                                }}
                              >
                                {loading ? (
                                  <motion.span
                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 1.4, repeat: Infinity }}
                                  >
                                    Sending...
                                  </motion.span>
                                ) : 'Send Invite'}
                              </Button>
                            </motion.div>

                            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                              <Button
                                type="button"
                                fullWidth
                                variant="outlined"
                                onClick={onClose}
                                sx={{
                                  borderColor: 'rgba(255,255,255,0.1)',
                                  color: '#8b8aab',
                                  height: 44,
                                  '&:hover': {
                                    borderColor: 'rgba(255,255,255,0.2)',
                                    background: 'rgba(255,255,255,0.04)',
                                    color: '#c4c3e0',
                                  },
                                }}
                              >
                                Cancel
                              </Button>
                            </motion.div>
                          </Stack>
                        </Stack>
                      </Box>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Box>
            </Paper>
          </motion.div>
        </Box>
      </AnimatePresence>
    </ThemeProvider>
  );
}