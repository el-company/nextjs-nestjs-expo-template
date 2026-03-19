"use client";

import React, { type JSX } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useAuth } from "@/providers/auth-provider";
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

function UserMenu(): JSX.Element {
  const { user, logout, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
    );
  }

  const initials = user
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || user.username[0] || "U"}`
    : "";

  return (
    <div className="relative group">
      <button className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted">
        {user?.imageUrl ? (
          <Image
            src={user.imageUrl}
            alt={user.username}
            width={32}
            height={32}
            className="rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
            {initials.toUpperCase()}
          </div>
        )}
      </button>
      <div className="absolute right-0 mt-2 w-48 py-2 bg-background border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        <div className="px-4 py-2 border-b border-border">
          <p className="text-sm font-medium">{user?.username}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <Link
          href="/profile"
          className="block px-4 py-2 text-sm hover:bg-muted"
        >
          Profile
        </Link>
        <button
          onClick={logout}
          className="block w-full text-left px-4 py-2 text-sm hover:bg-muted text-destructive"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

export function Navbar(): JSX.Element {
  const { isAuthenticated, isLoading } = useAuth();

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

          {!isLoading && isAuthenticated ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/profile">Profile</Link>
              </Button>
              <UserMenu />
            </>
          ) : !isLoading ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/sign-in">Sign In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/sign-up">Sign Up</Link>
              </Button>
            </>
          ) : null}

          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
