import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { ApiError, api } from '@/lib/api';
import type { Account, Role } from '@/lib/types';

interface AuthValue {
  user: Account | null;
  loading: boolean;
  login: (email: string, password: string, portal: 'admin' | 'student') => Promise<Account>;
  logout: () => Promise<void>;
  /** Update the cached account (e.g. after changing the profile photo or password). */
  setUser: (account: Account) => void;
}

const AuthContext = createContext<AuthValue | null>(null);
const ME_KEY = ['auth', 'me'];

/**
 * Drops every cached query except the session itself, so one user's data can never leak into the next session.
 * The session query must survive: `AuthProvider` is subscribed to it, and `setQueryData` on a *removed* query would
 * update an entry the observer no longer watches (the UI would keep showing the old user).
 * Only queries are dropped — never `qc.clear()`, which would also cancel mutations still in flight (e.g. the login itself).
 */
const dropUserData = (qc: QueryClient) => qc.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth' });

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();

  const { data: user = null, isPending } = useQuery({
    queryKey: ME_KEY,
    queryFn: async () => {
      try {
        return await api.get<Account>('/auth/me');
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) return null;
        throw err;
      }
    },
    staleTime: 5 * 60_000,
    retry: false,
  });

  // Any API call answered with 401 (expired/revoked session) signs the user out everywhere.
  useEffect(() => {
    const onUnauthenticated = () => {
      dropUserData(qc);
      qc.setQueryData(ME_KEY, null);
    };
    window.addEventListener('lc:unauthenticated', onUnauthenticated);
    return () => window.removeEventListener('lc:unauthenticated', onUnauthenticated);
  }, [qc]);

  const login = useCallback(
    async (email: string, password: string, portal: 'admin' | 'student') => {
      const account = await api.post<Account>('/auth/login', { email, password, portal });
      dropUserData(qc);
      qc.setQueryData(ME_KEY, account);
      return account;
    },
    [qc],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      dropUserData(qc);
      qc.setQueryData(ME_KEY, null);
    }
  }, [qc]);

  const setUser = useCallback((account: Account) => qc.setQueryData(ME_KEY, account), [qc]);

  const value = useMemo(() => ({ user, loading: isPending, login, logout, setUser }), [user, isPending, login, logout, setUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export const homeFor = (role: Role) => (role === 'ADMIN' ? '/admin' : '/student');
