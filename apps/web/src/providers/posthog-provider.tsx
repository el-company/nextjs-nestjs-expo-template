"use client";

import React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, type ReactNode, Suspense } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { useAuth } from "@/providers/auth-provider";
import { env } from "@/env";

// Initialize PostHog when the client side component mounts
if (typeof window !== "undefined") {
  posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
    capture_pageview: false, // We'll handle this manually
    autocapture: true, // Automatically capture button clicks, form submissions, etc.
    person_profiles: "identified_only", // Only create profiles for identified users
  });
}

interface PostHogProviderProps {
  children: ReactNode;
}

// User identification component to handle auth integration
function PostHogUserIdentification(): React.ReactElement | null {
  const { user, isAuthenticated } = useAuth();
  const posthogClient = usePostHog();

  useEffect(() => {
    if (isAuthenticated && user) {
      posthogClient.identify(user.id, {
        email: user.email,
        name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username,
        first_name: user.firstName,
        last_name: user.lastName,
      });
    } else {
      posthogClient.reset();
    }
  }, [isAuthenticated, user, posthogClient]);

  return null;
}

// Page view tracking component
function PostHogPageView(): React.ReactElement | null {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthogClient = usePostHog();

  useEffect(() => {
    if (pathname) {
      let url = window.origin + pathname;
      if (searchParams.toString()) {
        url = `${url}?${searchParams.toString()}`;
      }

      posthogClient.capture("$pageview", { $current_url: url });
    }
  }, [pathname, searchParams, posthogClient]);

  return null;
}

// Suspense wrapper for PostHogPageView to prevent client-side rendering opt-out
function SuspendedTracking(): React.ReactElement {
  return (
    <Suspense fallback={null}>
      <PostHogPageView />
      <PostHogUserIdentification />
    </Suspense>
  );
}

export function PostHogProvider({
  children,
}: PostHogProviderProps): React.ReactElement {
  return (
    <PHProvider client={posthog}>
      <SuspendedTracking />
      {children}
    </PHProvider>
  );
}

export { posthog };
