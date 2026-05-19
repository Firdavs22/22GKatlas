'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/lib/types';
import api, { clearAuthData, storeAuthData } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  loading: boolean;
  /** Re-fetch /me and update user — used after onboarding completion etc. */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const { data } = await api.post('/auth/login', { email, password });
    storeAuthData(data);
    setToken(data.token);
    // Fetch onboarding state etc. — login response has only the bare user fields.
    let fullUser = data.user;
    try {
      const me = await api.get('/me');
      fullUser = { ...data.user, ...me.data };
      localStorage.setItem('user', JSON.stringify(fullUser));
    } catch { /* */ }
    setUser(fullUser);
    return fullUser;
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch {
      // Ignore errors during logout
    }
    clearAuthData();
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  const refreshUser = async () => {
    try {
      const { data } = await api.get('/me');
      if (data) {
        setUser(prev => prev ? ({ ...prev, ...data }) : data);
        try {
          const stored = localStorage.getItem('user');
          const merged = { ...(stored ? JSON.parse(stored) : {}), ...data };
          localStorage.setItem('user', JSON.stringify(merged));
        } catch { /* */ }
      }
    } catch { /* */ }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
