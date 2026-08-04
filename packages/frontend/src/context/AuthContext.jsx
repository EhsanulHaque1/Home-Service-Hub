import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { fetchCurrentUser, loginUser, logoutUser, registerUser } from '@/lib/api';

const AuthContext = createContext({
  user: null,
  loading: true,
  refreshUser: async () => {},
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  notifyAuthChange: () => {},
});

const authChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('auth_channel')
  : null;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetchCurrentUser();
      if (res?.user) {
        setUser(res.user);
        return res.user;
      } else {
        setUser(null);
        return null;
      }
    } catch (e) {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const notifyAuthChange = useCallback(() => {
    try {
      authChannel?.postMessage('AUTH_STATE_CHANGED');
      localStorage.setItem('auth_event', Date.now().toString());
    } catch (e) {}
  }, []);

  useEffect(() => {
    refreshUser();

    // Listen for cross-tab auth changes via BroadcastChannel
    const handleChannelMessage = (event) => {
      if (event.data === 'AUTH_STATE_CHANGED') {
        refreshUser();
      }
    };
    authChannel?.addEventListener('message', handleChannelMessage);

    // Listen for storage events across windows/tabs
    const handleStorageChange = (e) => {
      if (e.key === 'auth_event') {
        refreshUser();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Re-check auth state when tab gains focus or becomes visible
    const handleFocus = () => {
      refreshUser();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshUser();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      authChannel?.removeEventListener('message', handleChannelMessage);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refreshUser]);

  const login = async (credentials) => {
    const res = await loginUser(credentials);
    if (res?.user) {
      setUser(res.user);
      notifyAuthChange();
    }
    return res;
  };

  const register = async (userData) => {
    const res = await registerUser(userData);
    if (res?.user && !res?.requires_verification) {
      setUser(res.user);
      notifyAuthChange();
    }
    return res;
  };

  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
      notifyAuthChange();

      // Wipe any non-httpOnly client cookies on sign out
      try {
        document.cookie.split(';').forEach((c) => {
          document.cookie = c
            .replace(/^ +/, '')
            .replace(/=.*/, '=;expires=' + new Date(0).toUTCString() + ';path=/');
        });
      } catch (e) {}
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser, login, register, logout, notifyAuthChange }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
