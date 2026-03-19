import React from "react";
import type { Metadata } from "next";
import "@/styles/globals.css";
import { type JSX } from "react";
import { AppTRPCProvider } from "@/providers/trpc-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { ReduxProvider } from "@/providers/redux-provider";
import { PostHogProvider } from "@/providers/posthog-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { Navbar } from "@/components/navbar";
import { ErrorBoundary } from "@/components/error-boundary";

export const metadata: Metadata = {
  title: "App Template",
  description: "A web application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground font-sans antialiased">
        <ThemeProvider>
          <AuthProvider>
            <PostHogProvider>
              <ReduxProvider>
                <AppTRPCProvider>
                  <div className="flex flex-col min-h-screen">
                    <Navbar />
                    <main className="flex-grow">
                      <ErrorBoundary>{children}</ErrorBoundary>
                    </main>
                  </div>
                </AppTRPCProvider>
              </ReduxProvider>
            </PostHogProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
