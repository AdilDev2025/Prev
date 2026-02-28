import { useState } from 'react';
import { inviteApi } from '../../api/client';

export default function InviteModal({ workspaceId, onClose }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await inviteApi.send(workspaceId, email, role);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3>Invite Member</h3>
      {error && <div className="alert alert-error">{error}</div>}
      {result && (
        <div className="alert alert-success">
          <p>✅ {result.message}</p>
          {result.emailSent ? (
            <p style={{ marginTop: 4 }}>📧 Invitation email sent to <strong>{email}</strong></p>
          ) : (
            <div style={{ marginTop: 4 }}>
              <p>⚠️ Email delivery failed — share the invite code manually:</p>
              <p style={{ marginTop: 4 }}>
                <strong>Invite Code:</strong>{' '}
                <code style={{ background: '#f0f0f0', padding: '2px 8px', borderRadius: 4, fontSize: 14, userSelect: 'all' }}>
                  {result.invite?.id}
                </code>
              </p>
            </div>
          )}
        </div>
      )}
      <form onSubmit={handleSubmit} className="inline-form" style={{ flexWrap: 'wrap', gap: 8 }}>
        <input
          type="email"
          placeholder="user@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{ flex: 1, minWidth: 200 }}
        />
        <select value={role} onChange={e => setRole(e.target.value)}>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Sending...' : 'Send Invite'}
        </button>
        <button type="button" className="btn" onClick={onClose}>Close</button>
      </form>
    </div>
  );
}

