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
  _id: string;
  role: "admin" | "user";
  tier?: "free" | "pro";
  profilePicture: string | null;
  username: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  // Resolves once the code is on its way; no session exists until verifyOtp.
  register: (
    username: string,
    email: string,
    password: string
  ) => Promise<void>;
  verifyOtp: (email: string, code: string) => Promise<User>;
  resendOtp: (email: string) => Promise<void>;
  googleLogin: (code: string) => Promise<User>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
}

// Thrown by login() when the account exists and the password is right, but the
// address has not been verified — the caller routes to the code screen.
export class EmailNotVerifiedError extends Error {
  constructor(public email: string) {
    super("Verify your email address to sign in.");
    this.name = "EmailNotVerifiedError";
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();
  // update both local state and axios instance when token changes
  const updateAccessToken = useCallback((token: string | null) => {
    setAccessTokenState(token);
    setAccessToken(token); // Update axios instance
  }, []);

  // load user on mount
  // this runs when the app first loads to check if
  // the user is logged in via the httpOnly refresh cookie.
  const loadUserOnMount = useCallback(async () => {
    setIsLoading(true);
    try {
      // try to get a new access token
      const res = await axiosInstance.post("/api/auth/refresh");
      const newAccessToken = res.data.accessToken;
      updateAccessToken(newAccessToken);

      // use the new token to get user data
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

  // listen for token refresh failures from axios interceptor
  useEffect(() => {
    const handleTokenRefreshFailed = () => {
      // logout the user when token refresh fails
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
        return user;
      } catch (error: any) {
        const data = error.response?.data;
        if (data?.code === "EMAIL_NOT_VERIFIED") {
          throw new EmailNotVerifiedError(data.email ?? email);
        }
        console.error("Login failed:", error);
        throw new Error(data?.error || "Login failed");
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
        // No auto-login: the account is unverified until a code is entered.
      } catch (error: any) {
        console.error("Registration failed:", error);
        throw new Error(error.response?.data?.error || "Registration failed");
      }
    },
    []
  );

  const verifyOtp = useCallback(
    async (email: string, code: string) => {
      try {
        const res = await axiosInstance.post("/api/auth/verify-otp", {
          email,
          code,
        });
        const { user, accessToken } = res.data;
        setUser(user);
        updateAccessToken(accessToken);
        return user;
      } catch (error: any) {
        throw new Error(error.response?.data?.error || "Verification failed");
      }
    },
    [updateAccessToken]
  );

  const resendOtp = useCallback(async (email: string) => {
    try {
      await axiosInstance.post("/api/auth/resend-otp", { email });
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Could not send a new code"
      );
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await axiosInstance.post("/api/auth/logout");
    } catch (error) {
      console.error("Logout failed on server:", error);
    } finally {
      // clear client data
      setUser(null);
      updateAccessToken(null);
      router.push("/login");
    }
  }, [updateAccessToken, router]);

  // Revokes every session for this user, on every device, not just this one.
  const logoutAll = useCallback(async () => {
    try {
      await axiosInstance.post("/api/auth/logout-all");
    } catch (error) {
      console.error("Sign out of all devices failed on server:", error);
    } finally {
      setUser(null);
      updateAccessToken(null);
      router.push("/login");
    }
  }, [updateAccessToken, router]);

  const googleLogin = useCallback(
    async (code: string) => {
      try {
        const res = await axiosInstance.post("/api/auth/google", { code });
        const { user, accessToken } = res.data;
        setUser(user);
        updateAccessToken(accessToken);
        return user;
      } catch (error: any) {
        console.error("Google Login failed:", error);
        throw new Error(error.response?.data?.error || "Google Login failed");
      }
    },
    [updateAccessToken]
  );

  const value = {
    user,
    accessToken,
    isLoading,
    login,
    register,
    verifyOtp,
    resendOtp,
    googleLogin,
    logout,
    logoutAll,
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
