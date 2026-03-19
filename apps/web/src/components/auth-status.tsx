"use client";

import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";
import { type JSX } from "react";

export function AuthStatus(): JSX.Element {
  const { isAuthenticated: isSignedIn } = useAuth();

  return (
    <div className="p-4 bg-slate-100 rounded-lg mb-8">
      <h2 className="text-xl font-semibold mb-2">Authentication Status</h2>
      <p className="mb-2">
        Current status:{" "}
        <span
          className={`font-bold ${isSignedIn ? "text-green-600" : "text-red-600"}`}
        >
          {isSignedIn ? "Signed In" : "Signed Out"}
        </span>
      </p>

      {isSignedIn ? (
        <Link href="/profile" className="text-primary hover:underline">
          View your profile
        </Link>
      ) : (
        <p>Sign in to access protected routes and view your profile</p>
      )}
    </div>
  );
}
