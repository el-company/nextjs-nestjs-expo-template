"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
  type JSX,
} from "react";

interface User {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  isEmailVerified: boolean;
  roles: string[];
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthResponse {
  user: User;
  tokens: TokenPair;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (data: RegisterData) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
  refreshTokens: () => Promise<TokenPair | null>;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const TOKEN_EXPIRY_KEY = "token_expiry";

function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getStoredTokens = useCallback(() => {
    if (typeof window === "undefined") return null;
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    const expiryStr = localStorage.getItem(TOKEN_EXPIRY_KEY);
    const expiry = expiryStr ? parseInt(expiryStr, 10) : 0;
    return { accessToken, refreshToken, expiry };
  }, []);

  const storeTokens = useCallback((tokens: TokenPair) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    localStorage.setItem(
      TOKEN_EXPIRY_KEY,
      String(Date.now() + tokens.expiresIn)
    );
  }, []);

  const clearTokens = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  }, []);

  const refreshTokens = useCallback(async (): Promise<TokenPair | null> => {
    const stored = getStoredTokens();
    if (!stored?.refreshToken) return null;

    try {
      const response = await fetch(`${getApiUrl()}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: stored.refreshToken }),
      });

      if (!response.ok) {
        clearTokens();
        setUser(null);
        return null;
      }

      const tokens: TokenPair = await response.json();
      storeTokens(tokens);
      return tokens;
    } catch {
      clearTokens();
      setUser(null);
      return null;
    }
  }, [getStoredTokens, storeTokens, clearTokens]);

  const getToken = useCallback(async (): Promise<string | null> => {
    const stored = getStoredTokens();
    if (!stored?.accessToken) return null;

    // Check if token is about to expire (within 1 minute)
    if (stored.expiry && stored.expiry - Date.now() < 60 * 1000) {
      const newTokens = await refreshTokens();
      return newTokens?.accessToken || null;
    }

    return stored.accessToken;
  }, [getStoredTokens, refreshTokens]);

  const fetchUser = useCallback(async (): Promise<User | null> => {
    const token = await getToken();
    if (!token) return null;

    try {
      const response = await fetch(`${getApiUrl()}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          clearTokens();
        }
        return null;
      }

      return await response.json();
    } catch {
      return null;
    }
  }, [getToken, clearTokens]);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthResponse> => {
      const response = await fetch(`${getApiUrl()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
      }

      const data: AuthResponse = await response.json();
      storeTokens(data.tokens);
      setUser(data.user);
      return data;
    },
    [storeTokens]
  );

  const register = useCallback(
    async (data: RegisterData): Promise<AuthResponse> => {
      const response = await fetch(`${getApiUrl()}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Registration failed");
      }

      const result: AuthResponse = await response.json();
      storeTokens(result.tokens);
      setUser(result.user);
      return result;
    },
    [storeTokens]
  );

  const logout = useCallback(async (): Promise<void> => {
    const token = await getToken();
    if (token) {
      try {
        await fetch(`${getApiUrl()}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Ignore logout errors
      }
    }
    clearTokens();
    setUser(null);
  }, [getToken, clearTokens]);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      const fetchedUser = await fetchUser();
      setUser(fetchedUser);
      setIsLoading(false);
    };

    initAuth();
  }, [fetchUser]);

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
