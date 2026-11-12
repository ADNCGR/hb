import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { useMe } from '@/api/hooks';
import { onAuthEvent, tokenStore } from '@/api/transport';
import type { Me, Role } from '@/api/types';

interface AuthValue {
  token: string | null;
  me: Me | undefined;
  loading: boolean;
  suspended: boolean;
  expiredNotice: boolean;
  login: (email: string, motDePasse: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => tokenStore.get());
  const [suspended, setSuspended] = useState(false);
  const [expiredNotice, setExpiredNotice] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const meQ = useMe(!!token && !suspended);

  useEffect(() => onAuthEvent((e) => {
    if (e === 'expired') {
      setToken(null);
      setExpiredNotice(true);
      qc.clear();
      navigate('/connexion', { replace: true });
    } else {
      setSuspended(true);
    }
  }), [qc, navigate]);

  const login = useCallback(async (email: string, motDePasse: string) => {
    const res = await api.auth.login(email, motDePasse);
    tokenStore.set(res.token);
    qc.clear();
    setSuspended(false);
    setExpiredNotice(false);
    setToken(res.token);
  }, [qc]);

  const logout = useCallback(() => {
    tokenStore.set(null);
    setToken(null);
    setSuspended(false);
    qc.clear();
    navigate('/connexion', { replace: true });
  }, [qc, navigate]);

  const value = useMemo<AuthValue>(() => ({
    token, me: meQ.data, loading: !!token && meQ.isPending && !suspended, suspended, expiredNotice, login, logout,
  }), [token, meQ.data, meQ.isPending, suspended, expiredNotice, login, logout]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth hors AuthProvider');
  return v;
}

export function useRoles(actifId: string | undefined) {
  const { me } = useAuth();
  return useMemo(() => {
    const roles: Role[] = me && actifId ? me.acces.filter((a) => a.actifId === actifId).map((a) => a.role) : [];
    const has = (r: Role) => roles.includes(r) || roles.includes('ADMIN');
    return {
      roles,
      has,
      isOwner: has('PROPRIETAIRE'),
      isFinance: has('FINANCE_AUTEUR') || has('FINANCE_VERIFICATEUR') || has('FINANCE_PUBLICATION'),
    };
  }, [me, actifId]);
}
