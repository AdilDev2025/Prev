const nodemailer = require('nodemailer');

// Create reusable transporter — configured from env vars
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.SMTP_USER;
  const pass = (process.env.SMTP_PASS || '').replace(/\s/g, ''); // Strip spaces from app passwords

  if (!user || !pass) {
    console.warn('⚠️  SMTP_USER / SMTP_PASS not set — emails will be logged to console only');
    return null;
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });

  return transporter;
}

/**
 * Send a workspace invitation email
 */
async function sendInviteEmail({ to, inviterName, workspaceName, inviteId, role }) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const acceptUrl = `${frontendUrl}/dashboard?inviteId=${inviteId}`;

  const subject = `You're invited to join "${workspaceName}" on NEURO-FORCE`;

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
      <h2 style="color:#1a1a1a;margin-bottom:4px;">⚡ NEURO-FORCE</h2>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />

      <p>Hi there,</p>
      <p><strong>${inviterName}</strong> has invited you to join the workspace <strong>"${workspaceName}"</strong> as a <strong>${role}</strong>.</p>

      <div style="background:#f0f4ff;border:1px solid #c7d2fe;border-radius:8px;padding:16px;margin:20px 0;text-align:center;">
        <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Your Invite Code</p>
        <code style="font-size:18px;font-weight:700;color:#2563eb;letter-spacing:0.5px;">${inviteId}</code>
      </div>

      <p>To accept this invitation:</p>
      <ol style="padding-left:20px;color:#374151;">
        <li>Sign in to NEURO-FORCE (or create an account with <strong>${to}</strong>)</li>
        <li>Go to your Dashboard</li>
        <li>Paste the invite code above in the <em>"Join a Workspace"</em> section</li>
      </ol>

      <a href="${acceptUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin-top:12px;">
        Open Dashboard →
      </a>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
      <p style="font-size:12px;color:#9ca3af;">
        If you didn't expect this email, you can safely ignore it.<br/>
        NEURO-FORCE Productivity Management System
      </p>
    </div>
  `;

  const text = `
NEURO-FORCE — Workspace Invitation

${inviterName} has invited you to join "${workspaceName}" as a ${role}.

Your Invite Code: ${inviteId}

To accept:
1. Sign in at ${frontendUrl} (use email: ${to})
2. Go to Dashboard
3. Paste the invite code in "Join a Workspace"

Or open: ${acceptUrl}
  `.trim();

  const transport = getTransporter();

  if (!transport) {
    // No SMTP configured — log to console for development
    console.log('\n📧 ═══ EMAIL (console-only, SMTP not configured) ═══');
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Invite Code: ${inviteId}`);
    console.log(`   Accept URL: ${acceptUrl}`);
    console.log('═══════════════════════════════════════════════════\n');
    return { sent: false, reason: 'SMTP not configured', inviteId };
  }

  try {
    const info = await transport.sendMail({
      from: `"NEURO-FORCE" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });
    console.log(`📧 Invite email sent to ${to} — messageId: ${info.messageId}`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error(`📧 Failed to send invite email to ${to}:`, err.message);
    return { sent: false, reason: err.message };
  }
}

module.exports = { sendInviteEmail };

