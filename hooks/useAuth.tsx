"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import axiosInstance, { setAccessToken } from "@/lib/axiosInstance";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  role: "admin" | "user";
  profilePicture: string | null;
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
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();
  // Update both local state and axios instance when token changes
  const updateAccessToken = useCallback((token: string | null) => {
    setAccessTokenState(token);
    setAccessToken(token); // Update axios instance
  }, []);

  // --- 1. Load User on Mount ---
  // This runs when the app first loads to check if
  // the user is logged in via the httpOnly refresh cookie.
  const loadUserOnMount = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Try to get a new access token
      const res = await axiosInstance.post("/api/auth/refresh");
      const newAccessToken = res.data.accessToken;
      updateAccessToken(newAccessToken);

      // 2. Use the new token to get user data
      const userRes = await axiosInstance.get("/api/auth/me");
      setUser(userRes.data);
    } catch (error) {
      // If refresh fails, they are logged out
      setUser(null);
      updateAccessToken(null);
    } finally {
      setIsLoading(false);
    }
  }, [updateAccessToken]);

  useEffect(() => {
    loadUserOnMount();
  }, [loadUserOnMount]);

  // Listen for token refresh failures from axios interceptor ---
  useEffect(() => {
    const handleTokenRefreshFailed = () => {
      // Logout the user when token refresh fails
      setUser(null);
      updateAccessToken(null);
    };

    window.addEventListener(
      "auth:token-refresh-failed",
      handleTokenRefreshFailed
    );

    return () => {
      window.removeEventListener(
        "auth:token-refresh-failed",
        handleTokenRefreshFailed
      );
    };
  }, [updateAccessToken]);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await axiosInstance.post("/api/auth/login", {
          email,
          password,
        });
        const { user, accessToken } = res.data;

        setUser(user);
        updateAccessToken(accessToken);
      } catch (error: any) {
        console.error("Login failed:", error);
        throw new Error(error.response?.data?.error || "Login failed");
      }
    },
    [updateAccessToken]
  );

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      try {
        await axiosInstance.post("/api/auth/register", {
          username,
          email,
          password,
        });
        // after successful registration, log them in
        await login(email, password);
      } catch (error: any) {
        console.error("Registration failed:", error);
        throw new Error(error.response?.data?.error || "Registration failed");
      }
    },
    [login]
  );

  const logout = useCallback(async () => {
    try {
      await axiosInstance.post("/api/auth/logout");
      router.push("/login");
    } catch (error) {
      console.error("Logout failed on server:", error);
    } finally {
      // clear client data
      setUser(null);
      updateAccessToken(null);
      // router.push("/login");
    }
  }, [updateAccessToken]);

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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
