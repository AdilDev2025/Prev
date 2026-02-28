import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('nf_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('nf_user');
    if (stored && token) {
      try { setUser(JSON.parse(stored)); } catch { logout(); }
    }
    setLoading(false);
  }, []);

  async function login(email, password) {
    const data = await authApi.login(email, password);
    localStorage.setItem('nf_token', data.token);
    const u = { userId: data.userId, name: data.name, email: data.email, role: data.role };
    localStorage.setItem('nf_user', JSON.stringify(u));
    setToken(data.token);
    setUser(u);
    return data;
  }

  async function register(name, email, password) {
    return await authApi.register(name, email, password);
  }

  function logout() {
    localStorage.removeItem('nf_token');
    localStorage.removeItem('nf_user');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
