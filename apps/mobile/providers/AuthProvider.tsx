import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";
import type { AuthResponse, TokenPair, AuthUser, RegisterData } from "@repo/services";
import { getApiUrl } from "../utils/api";

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

const REFRESH_TOKEN_KEY = "refresh_token";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Access token and expiry kept in memory — no SecureStore reads per API call
  const accessTokenRef = useRef<string | null>(null);
  const accessTokenExpiresAtRef = useRef<number>(0);
  const refreshPromiseRef = useRef<Promise<TokenPair | null> | null>(null);

  const storeTokens = useCallback(async (tokens: TokenPair) => {
    const expiresAt = tokens.expiresAt || Date.now() + tokens.expiresIn;
    // Keep access token in memory
    accessTokenRef.current = tokens.accessToken;
    accessTokenExpiresAtRef.current = expiresAt;
    // Persist only refresh token to secure storage
    try {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
    } catch (err) {
      console.error("Error storing refresh token:", err);
    }
  }, []);

  const clearTokens = useCallback(async () => {
    accessTokenRef.current = null;
    accessTokenExpiresAtRef.current = 0;
    try {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } catch (err) {
      console.error("Error clearing tokens:", err);
    }
  }, []);

  const refreshTokens = useCallback(async (): Promise<TokenPair | null> => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    refreshPromiseRef.current = (async () => {
      try {
        const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        if (!refreshToken) return null;

        const response = await fetch(`${getApiUrl()}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          await clearTokens();
          setUser(null);
          return null;
        }

        const tokens: TokenPair = await response.json();
        await storeTokens(tokens);
        return tokens;
      } catch (err) {
        console.error("Error refreshing tokens:", err);
        await clearTokens();
        setUser(null);
        return null;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  }, [storeTokens, clearTokens]);

  const getToken = useCallback(async (): Promise<string | null> => {
    const token = accessTokenRef.current;
    if (!token) {
      const newTokens = await refreshTokens();
      return newTokens?.accessToken || null;
    }

    if (accessTokenExpiresAtRef.current && accessTokenExpiresAtRef.current - Date.now() < 60 * 1000) {
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
          await clearTokens();
        }
        return null;
      }

      return await response.json();
    } catch (err) {
      console.error("Error fetching user:", err);
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
      await storeTokens(data.tokens);
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
      await storeTokens(result.tokens);
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
    await clearTokens();
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
