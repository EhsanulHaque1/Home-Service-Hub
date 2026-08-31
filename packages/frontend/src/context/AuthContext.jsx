import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  fetchCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
} from "@/lib/api";

const AuthContext = createContext({
  user: null,
  loading: true,
  refreshUser: async () => {},
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  notifyAuthChange: () => {},
});

const authChannel =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel("auth_channel")
    : null;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      // Fetch user info - this will include token in Authorization header if available
      const res = await fetchCurrentUser();
      if (res?.user) {
        setUser(res.user);
        return res.user;
      } else {
        setUser(null);
        // If user fetch failed, clear the token
        localStorage.removeItem("auth_token");
        return null;
      }
    } catch (e) {
      setUser(null);
      // If fetch failed (e.g., 401), clear the token
      if (e?.status === 401) {
        localStorage.removeItem("auth_token");
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const notifyAuthChange = useCallback(() => {
    try {
      authChannel?.postMessage("AUTH_STATE_CHANGED");
      localStorage.setItem("auth_event", Date.now().toString());
    } catch (e) {}
  }, []);

  useEffect(() => {
    refreshUser();

    // Listen for cross-tab auth changes via BroadcastChannel
    const handleChannelMessage = (event) => {
      if (event.data === "AUTH_STATE_CHANGED") {
        refreshUser();
      }
    };
    authChannel?.addEventListener("message", handleChannelMessage);

    // Listen for storage events across windows/tabs
    const handleStorageChange = (e) => {
      if (e.key === "auth_event") {
        refreshUser();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // Re-check auth state when tab gains focus or becomes visible
    const handleFocus = () => {
      refreshUser();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshUser();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      authChannel?.removeEventListener("message", handleChannelMessage);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
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
      await logoutUser().catch(() => null);
    } finally {
      setUser(null);
      // Clear token from localStorage
      localStorage.removeItem("auth_token");
      notifyAuthChange();

      // Wipe all non-httpOnly client cookies across common domain variations
      try {
        const cookies = document.cookie.split(";");
        const domains = [
          window.location.hostname,
          "." + window.location.hostname,
          "",
        ];
        cookies.forEach((c) => {
          const name = c.split("=")[0].trim();
          if (name) {
            domains.forEach((d) => {
              const domainAttr = d ? `;domain=${d}` : "";
              document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/${domainAttr}`;
              document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/api${domainAttr}`;
            });
          }
        });
      } catch (e) {}
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        refreshUser,
        login,
        register,
        logout,
        notifyAuthChange,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
