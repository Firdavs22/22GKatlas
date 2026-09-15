'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/lib/types';
import api, { clearAuthData, removeLegacyCredentials, storeAuthData } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  loading: boolean;
  refreshUser: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    removeLegacyCredentials();
    api.get('/me').then(({ data }) => {
      if (active) { storeAuthData({ user: data }); setUser(data); }
    }).catch(() => {
      if (active) { clearAuthData(); setUser(null); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const { data } = await api.post('/auth/login', { email, password, client: 'web' });
    storeAuthData(data);
    setUser(data.user);
    return data.user;
  };
  const logout = async () => {
    // Do not report a successful logout while server cookies are still active.
    try { await api.post('/auth/logout', {}); }
    catch { window.alert('Не удалось выйти. Проверьте соединение и повторите.'); return; }
    clearAuthData();
    setUser(null);
    window.location.assign('/login');
  };
  const refreshUser = async () => {
    const { data } = await api.get('/me');
    storeAuthData({ user: data });
    setUser(data);
  };
  return <AuthContext.Provider value={{ user, login, logout, loading, refreshUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
