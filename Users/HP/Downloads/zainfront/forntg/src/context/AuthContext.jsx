import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('nf_user');
    const token = localStorage.getItem('nf_token');
    if (stored && token) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    setLoading(false);
  }, []);

  async function login(email, password) {
    const data = await authApi.login(email, password);
    localStorage.setItem('nf_token', data.token);
    const u = { userId: data.userId, name: data.name, email: data.email, role: data.role };
    localStorage.setItem('nf_user', JSON.stringify(u));
    setUser(u);
    return data;
  }

  async function register(name, email, password) {
    return authApi.register(name, email, password);
  }

  function logout() {
    localStorage.removeItem('nf_token');
    localStorage.removeItem('nf_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
