import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { api, setAccessToken, setSessionExpiredHandler } from '../api/client';
import { MeResponse, AuthUser } from '../api/types';

interface AuthContextValue {
  user: AuthUser | null;
  me: MeResponse | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<MeResponse | null>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  me: null,
  loading: true,
  login: async () => null,
  logout: async () => undefined,
  refreshMe: async () => undefined,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const applyMe = useCallback((data: MeResponse) => {
    setMe(data);
    setUser({
      id: data.id,
      email: data.email,
      role: data.role,
      accountStatus: data.accountStatus,
      memberLevel: data.memberLevel,
      aurId: data.memberId?.aurId ?? null,
    });
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setMe(null);
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      const data = await api.get<MeResponse>('/api/auth/me');
      applyMe(data);
    } catch {
      clearSession();
    } finally {
      setLoading(false);
    }
  }, [applyMe, clearSession]);

  useEffect(() => {
    setSessionExpiredHandler(() => clearSession());
    void refreshMe();
  }, [refreshMe, clearSession]);

  const login = useCallback(
    async (email: string, password: string): Promise<MeResponse | null> => {
      const data = await api.post<{ accessToken: string; user: AuthUser }>('/api/auth/login', {
        email,
        password,
      });
      setAccessToken(data.accessToken);
      const meData = await api.get<MeResponse>('/api/auth/me');
      applyMe(meData);
      return meData;
    },
    [applyMe],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      /* ignore */
    }
    clearSession();
  }, [clearSession]);

  return (
    <AuthContext.Provider value={{ user, me, loading, login, logout, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
