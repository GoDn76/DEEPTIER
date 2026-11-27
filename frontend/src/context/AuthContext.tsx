import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  authApi,
  getStoredSession,
  LoginResponse,
  registerUnauthorizedHandler,
  Role,
  saveStoredSession,
} from '../api/client';

export interface DemoPersona {
  label: string;
  shortRole: string;
  username: string;
  password: string;
  role: Role;
}

export const DEMO_PERSONAS: DemoPersona[] = [
  {
    label: 'Analyst',
    shortRole: 'ANALYST',
    username: 'analyst@deeptier.local',
    password: 'Analyst@123',
    role: 'ROLE_ANALYST',
  },
  {
    label: 'Approver',
    shortRole: 'APPROVER',
    username: 'approver@deeptier.local',
    password: 'Approver@123',
    role: 'ROLE_APPROVER',
  },
  {
    label: 'Admin',
    shortRole: 'ADMIN',
    username: 'admin@deeptier.local',
    password: 'Admin@123',
    role: 'ROLE_ADMIN',
  },
];

interface AuthContextValue {
  session: LoginResponse | null;
  isAuthenticated: boolean;
  isApproverOrAdmin: boolean;
  isAdmin: boolean;
  switchingPersona: boolean;
  login: (username: string, password: string) => Promise<LoginResponse>;
  register: (username: string, password: string) => Promise<LoginResponse>;
  switchPersona: (persona: DemoPersona) => Promise<LoginResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<LoginResponse | null>(() => getStoredSession());
  const [switchingPersona, setSwitchingPersona] = useState(false);
  const navigate = useNavigate();

  const applySession = useCallback((next: LoginResponse | null) => {
    saveStoredSession(next);
    setSession(next);
  }, []);

  const logout = useCallback(() => {
    applySession(null);
    navigate('/login', { replace: true });
  }, [applySession, navigate]);

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      applySession(null);
      navigate('/login', { replace: true });
    });
  }, [applySession, navigate]);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await authApi.login(username, password);
      applySession(res);
      return res;
    },
    [applySession],
  );

  const register = useCallback(
    async (username: string, password: string) => {
      const res = await authApi.register(username, password);
      applySession(res);
      return res;
    },
    [applySession],
  );

  const switchPersona = useCallback(
    async (persona: DemoPersona) => {
      setSwitchingPersona(true);
      try {
        const res = await authApi.login(persona.username, persona.password);
        applySession(res);
        return res;
      } finally {
        setSwitchingPersona(false);
      }
    },
    [applySession],
  );

  const value: AuthContextValue = {
    session,
    isAuthenticated: Boolean(session?.accessToken),
    isApproverOrAdmin: session?.role === 'ROLE_APPROVER' || session?.role === 'ROLE_ADMIN',
    isAdmin: session?.role === 'ROLE_ADMIN',
    switchingPersona,
    login,
    register,
    switchPersona,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
