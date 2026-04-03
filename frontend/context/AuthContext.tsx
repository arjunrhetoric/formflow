'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import * as authApi from '@/lib/api/auth';

interface User {
  _id: string;
  id: string;
  name: string;
  email: string;
  cursorColor: string;
  avatar_url: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const normalizeUser = (u: any): User => ({
    _id: u.id || u._id,
    id: u.id || u._id,
    name: u.name,
    email: u.email,
    cursorColor: u.cursorColor || '#2563eb',
    avatar_url: u.avatar_url || '',
  });

  useEffect(() => {
    const token = localStorage.getItem('formflow_token');
    if (!token) {
      setLoading(false);
      return;
    }
    authApi.getMe()
      .then((res) => setUser(normalizeUser(res.data.user)))
      .catch(() => localStorage.removeItem('formflow_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    localStorage.setItem('formflow_token', res.data.token);
    setUser(normalizeUser(res.data.user));
    const pendingInvite = localStorage.getItem('formflow_pending_invite');
    if (pendingInvite) {
      localStorage.removeItem('formflow_pending_invite');
      router.push(`/invite/${pendingInvite}`);
    } else {
      router.push('/dashboard');
    }
  }, [router]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await authApi.register(name, email, password);
    localStorage.setItem('formflow_token', res.data.token);
    setUser(normalizeUser(res.data.user));
    const pendingInvite = localStorage.getItem('formflow_pending_invite');
    if (pendingInvite) {
      localStorage.removeItem('formflow_pending_invite');
      router.push(`/invite/${pendingInvite}`);
    } else {
      router.push('/dashboard');
    }
  }, [router]);

  const logout = useCallback(() => {
    localStorage.removeItem('formflow_token');
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
