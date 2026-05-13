import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../lib/types';
import api from '../lib/api';
import * as auth from '../lib/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const stored = await auth.getUser();
      const token = await auth.getToken();
      if (stored && token) {
        setUser(JSON.parse(stored));
      }
    } catch {
      // Ignore errors loading stored user
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string): Promise<User> {
    if (__DEV__) console.log('[AUTH] login start', { email });
    const { data } = await api.post('/auth/login', {
      email,
      password,
      deviceName: 'Mobile App',
    });
    if (__DEV__) console.log('[AUTH] login success', { email: data.user.email, role: data.user.role });
    await auth.setToken(data.token);
    await auth.setRefreshToken(data.refreshToken);
    await auth.setUser(JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    try {
      const refreshToken = await auth.getRefreshToken();
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch {
      // Ignore — logout should always succeed locally
    }
    await auth.clearAuth();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
