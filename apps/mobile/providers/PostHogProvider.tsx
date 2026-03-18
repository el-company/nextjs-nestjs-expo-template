import React, { ReactNode, useEffect } from "react";
import { PostHogProvider as PostHogRNProvider } from "posthog-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./AuthProvider";

// Get the PostHog API key from environment variables
const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY || "";
const POSTHOG_HOST =
  process.env.EXPO_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";
// Define the shape of the global posthog object
declare global {
  // eslint-disable-next-line no-var
  var posthog:
    | {
        identify?: (userId: string, properties?: Record<string, any>) => void;
        reset?: () => void;
      }
    | undefined;
}

interface PostHogProviderProps {
  children: ReactNode;
}

interface PostHogCustomStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

export function PostHogProvider({
  children,
}: PostHogProviderProps): JSX.Element {
  const { isAuthenticated, user } = useAuth();

  // Identify user when they sign in
  useEffect(() => {
    if (isAuthenticated && user?.id && global.posthog?.identify) {
      // Identify the user in PostHog
      global.posthog.identify(user.id);
    } else if (global.posthog?.reset) {
      // Reset user identification when signed out
      global.posthog.reset();
    }
  }, [isAuthenticated, user]);

  const storage: PostHogCustomStorage = {
    getItem: async (key: string) => AsyncStorage.getItem(key),
    setItem: async (key: string, value: string) =>
      AsyncStorage.setItem(key, value),
    removeItem: async (key: string) => AsyncStorage.removeItem(key),
  };

  return (
    <PostHogRNProvider
      apiKey={POSTHOG_API_KEY}
      options={{
        host: POSTHOG_HOST,
        sendFeatureFlagEvent: true,
        preloadFeatureFlags: true,
        captureMode: "form",
        persistence: "file",
        flushAt: 20,
        flushInterval: 30000,
        disabled: false,
        defaultOptIn: true,
        disableGeoip: true,
        captureNativeAppLifecycleEvents: true,
        customStorage: storage,
        bootstrap: {
          distinctId: user?.id || undefined,
          isIdentifiedId: isAuthenticated || false,
        },
      }}
      autocapture={{
        captureTouches: true,
        captureLifecycleEvents: true,
        captureScreens: true,
      }}
    >
      {children}
    </PostHogRNProvider>
  );
}
