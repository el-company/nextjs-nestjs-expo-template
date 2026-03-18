"use client";

import { useEffect, useState, Suspense, type JSX } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@repo/ui/components/base/button";

function VerifyEmailContent(): JSX.Element {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Invalid verification link");
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/auth/verify-email`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "Verification failed");
        }

        setStatus("success");
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Verification failed");
      }
    };

    verifyEmail();
  }, [token]);

  if (status === "loading") {
    return (
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
        <h1 className="text-2xl font-bold">Verifying your email...</h1>
        <p className="text-muted-foreground">Please wait a moment</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="p-4 bg-primary/10 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
          <svg
            className="w-8 h-8 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold">Email Verified!</h1>
        <p className="text-muted-foreground">
          Your email has been successfully verified. You can now sign in to
          your account.
        </p>
        <Link href="/sign-in">
          <Button className="mt-4">Sign In</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-8 text-center">
      <div className="p-4 bg-destructive/10 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
        <svg
          className="w-8 h-8 text-destructive"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-destructive">Verification Failed</h1>
      <p className="text-muted-foreground">{error}</p>
      <Link href="/sign-in">
        <Button variant="outline" className="mt-4">
          Back to Sign In
        </Button>
      </Link>
    </div>
  );
}

export default function VerifyEmailPage(): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
