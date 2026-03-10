"use client";

import React, { type JSX } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { UserButton, SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";
import { Button } from "@repo/ui/components/base/button";

function ThemeToggle(): JSX.Element {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {/* Sun icon */}
      <svg
        className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
      {/* Moon icon */}
      <svg
        className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </Button>
  );
}

export function Navbar(): JSX.Element {
  const { isSignedIn } = useAuth();

  return (
    <nav className="border-b border-border bg-background">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="text-base font-semibold tracking-tight">
          App Template
        </Link>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">Home</Link>
          </Button>

          <Button variant="ghost" size="sm" asChild>
            <Link href="/chat">Chat</Link>
          </Button>

          {isSignedIn ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/profile">Profile</Link>
              </Button>
              <UserButton />
            </>
          ) : (
            <>
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm">Sign In</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="sm">Sign Up</Button>
              </SignUpButton>
            </>
          )}

          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
