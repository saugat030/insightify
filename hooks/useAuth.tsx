"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import axios from "axios";

interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- FIX: Use a ref to store the interceptor ID ---
  const interceptorId = useRef<number | null>(null);

  // --- FIX: Wrap setAuthToken in useCallback to make it stable ---
  // This function will set the token in state
  // and also update the axios interceptor safely.
  const setAuthToken = useCallback((token: string | null) => {
    setAccessToken(token);

    // --- FIX: Eject the *previous* interceptor if it exists ---
    if (interceptorId.current !== null) {
      axios.interceptors.request.eject(interceptorId.current);
    }

    // --- FIX: Add the new interceptor and store its ID ---
    interceptorId.current = axios.interceptors.request.use(
      (config) => {
        if (token) {
          config.headers["Authorization"] = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }, []); // This is stable: it only uses a state setter and a ref.

  // --- 1. Load User on Mount ---
  // This runs when the app first loads to check if
  // the user is logged in via the httpOnly refresh cookie.
  const loadUserOnMount = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Try to get a new access token
      const res = await axios.post("/api/auth/refresh");
      const newAccessToken = res.data.accessToken;
      setAuthToken(newAccessToken); // This function is now stable

      // 2. Use the new token to get user data
      const userRes = await axios.get("/api/auth/me");
      setUser(userRes.data);
    } catch (error) {
      // If refresh fails, they are logged out
      setUser(null);
      setAuthToken(null); // This function is now stable
    } finally {
      setIsLoading(false);
    }
  }, [setAuthToken]); // --- FIX: Add stable setAuthToken as dependency

  useEffect(() => {
    loadUserOnMount();
  }, [loadUserOnMount]); // --- FIX: This now correctly runs only once

  // --- 2. Login Function ---
  // --- FIX: Wrap in useCallback for performance ---
  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await axios.post("/api/auth/login", { email, password });
        const { user, accessToken } = res.data;

        setUser(user);
        setAuthToken(accessToken);
      } catch (error: any) {
        console.error("Login failed:", error);
        throw new Error(error.response?.data?.error || "Login failed");
      }
    },
    [setAuthToken] // --- FIX: Add stable dependency
  );

  // --- 3. Register Function ---
  // --- FIX: Wrap in useCallback for performance ---
  const register = useCallback(
    async (username: string, email: string, password: string) => {
      try {
        await axios.post("/api/auth/register", { username, email, password });
        // After successful registration, log them in
        await login(email, password);
      } catch (error: any) {
        console.error("Registration failed:", error);
        throw new Error(error.response?.data?.error || "Registration failed");
      }
    },
    [login] // --- FIX: Add stable dependency
  );

  // --- 4. Logout Function ---
  // --- FIX: Wrap in useCallback for performance ---
  const logout = useCallback(async () => {
    try {
      await axios.post("/api/auth/logout");
    } catch (error) {
      console.error("Logout failed on server:", error);
    } finally {
      // Always log out on client
      setUser(null);
      setAuthToken(null);
    }
  }, [setAuthToken]); // --- FIX: Add stable dependency

  const value = {
    user,
    accessToken,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// --- Custom Hook ---
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
