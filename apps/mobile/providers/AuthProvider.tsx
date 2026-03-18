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

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const TOKEN_EXPIRY_KEY = "token_expiry";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshPromiseRef = useRef<Promise<TokenPair | null> | null>(null);

  const getStoredTokens = useCallback(async () => {
    try {
      const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      const expiryStr = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY);
      const expiresAt = expiryStr ? parseInt(expiryStr, 10) : 0;
      return { accessToken, refreshToken, expiresAt };
    } catch (err) {
      console.error("Error getting stored tokens:", err);
      return { accessToken: null, refreshToken: null, expiresAt: 0 };
    }
  }, []);

  const storeTokens = useCallback(async (tokens: TokenPair) => {
    try {
      const expiresAt = tokens.expiresAt || Date.now() + tokens.expiresIn;
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
      await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, String(expiresAt));
    } catch (err) {
      console.error("Error storing tokens:", err);
    }
  }, []);

  const clearTokens = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY);
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
        const stored = await getStoredTokens();
        if (!stored.refreshToken) return null;

        const response = await fetch(`${getApiUrl()}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: stored.refreshToken }),
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
  }, [getStoredTokens, storeTokens, clearTokens]);

  const getToken = useCallback(async (): Promise<string | null> => {
    const stored = await getStoredTokens();
    if (!stored.accessToken) {
      const newTokens = await refreshTokens();
      return newTokens?.accessToken || null;
    }

    if (stored.expiresAt && stored.expiresAt - Date.now() < 60 * 1000) {
      const newTokens = await refreshTokens();
      return newTokens?.accessToken || null;
    }

    return stored.accessToken;
  }, [getStoredTokens, refreshTokens]);

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
