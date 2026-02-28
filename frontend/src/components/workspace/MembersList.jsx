import { useState, useEffect } from 'react';
import { workspaceApi } from '../../api/client';

export default function MembersList({ workspaceId }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleMsg, setRoleMsg] = useState('');

  async function loadMembers() {
    setLoading(true);
    try {
      const data = await workspaceApi.getMembers(workspaceId);
      setMembers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadMembers(); }, [workspaceId]);

  async function handleRoleChange(userId, currentRole) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    setRoleMsg('');
    try {
      await workspaceApi.updateMemberRole(workspaceId, userId, newRole);
      setRoleMsg(`Role updated to ${newRole}`);
      loadMembers();
    } catch (err) {
      setRoleMsg(`Error: ${err.message}`);
    }
  }

  if (loading) return <p>Loading members...</p>;
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div>
      {roleMsg && <div className="alert" style={{ marginBottom: 8 }}>{roleMsg}</div>}
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map(m => (
            <tr key={m.userId}>
              <td>{m.name} {m.isOwner && <span className="badge badge-green">Owner</span>}</td>
              <td>{m.email}</td>
              <td><span className="badge">{m.role}</span></td>
              <td>
                {!m.isOwner && (
                  <button
                    className="btn btn-sm"
                    onClick={() => handleRoleChange(m.userId, m.role)}
                  >
                    Make {m.role === 'admin' ? 'User' : 'Admin'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

