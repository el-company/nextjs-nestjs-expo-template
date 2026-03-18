"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
  type JSX,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import type { AuthResponse, TokenPair, AuthUser, RegisterData } from "@repo/services";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (data: RegisterData) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
  refreshTokens: () => Promise<TokenPair | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const publicRoutes = [
  "/",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const accessTokenRef = useRef<string | null>(null);
  const accessTokenExpiresAtRef = useRef<number>(0);
  const refreshPromiseRef = useRef<Promise<TokenPair | null> | null>(null);

  const setTokens = useCallback((tokens: TokenPair) => {
    accessTokenRef.current = tokens.accessToken;
    accessTokenExpiresAtRef.current =
      tokens.expiresAt || Date.now() + tokens.expiresIn;
  }, []);

  const clearTokens = useCallback(() => {
    accessTokenRef.current = null;
    accessTokenExpiresAtRef.current = 0;
  }, []);

  const handleAuthFailure = useCallback(
    (redirect = true) => {
      clearTokens();
      setUser(null);

      if (!redirect || typeof window === "undefined") return;
      const currentPath = pathname || "/";
      if (isPublicRoute(currentPath)) return;

      const signInUrl = `/sign-in?redirect=${encodeURIComponent(currentPath)}`;
      router.replace(signInUrl);
    },
    [clearTokens, pathname, router]
  );

  const refreshTokens = useCallback(async (): Promise<TokenPair | null> => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    refreshPromiseRef.current = (async () => {
      try {
        const response = await fetch(`${getApiUrl()}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });

        if (!response.ok) {
          handleAuthFailure();
          return null;
        }

        const tokens: TokenPair = await response.json();
        setTokens(tokens);
        return tokens;
      } catch {
        handleAuthFailure();
        return null;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  }, [handleAuthFailure, setTokens]);

  const getToken = useCallback(async (): Promise<string | null> => {
    const token = accessTokenRef.current;
    if (!token) {
      const newTokens = await refreshTokens();
      return newTokens?.accessToken || null;
    }

    if (
      accessTokenExpiresAtRef.current &&
      accessTokenExpiresAtRef.current - Date.now() < 60 * 1000
    ) {
      const newTokens = await refreshTokens();
      return newTokens?.accessToken || null;
    }

    return token;
  }, [refreshTokens]);

  const fetchUser = useCallback(async (): Promise<AuthUser | null> => {
    const token = await getToken();
    if (!token) return null;

    try {
      const response = await fetch(`${getApiUrl()}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleAuthFailure();
        }
        return null;
      }

      return await response.json();
    } catch {
      return null;
    }
  }, [getToken, handleAuthFailure]);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthResponse> => {
      const response = await fetch(`${getApiUrl()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
      }

      const data: AuthResponse = await response.json();
      setTokens(data.tokens);
      setUser(data.user);
      return data;
    },
    [setTokens]
  );

  const register = useCallback(
    async (data: RegisterData): Promise<AuthResponse> => {
      const response = await fetch(`${getApiUrl()}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Registration failed");
      }

      const result: AuthResponse = await response.json();
      setTokens(result.tokens);
      setUser(result.user);
      return result;
    },
    [setTokens]
  );

  const logout = useCallback(async (): Promise<void> => {
    const token = await getToken();
    if (token) {
      try {
        await fetch(`${getApiUrl()}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
      } catch {
        // Ignore logout errors
      }
    }
    clearTokens();
    setUser(null);
  }, [getToken, clearTokens]);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      setIsLoading(true);
      await refreshTokens();
      const fetchedUser = await fetchUser();
      if (isMounted) {
        setUser(fetchedUser);
        setIsLoading(false);
      }
    };

    void initAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    getToken,
    refreshTokens,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
