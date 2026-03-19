"use client";

import { useState, useRef, type JSX } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, getApiUrl } from "@/providers/auth-provider";
import { Button } from "@repo/ui/components/base/button";

export default function VerifyEmailPage(): JSX.Element {
  const router = useRouter();
  const { user, getToken, isLoading: authLoading } = useAuth();

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");

  const code = digits.join("");

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = [...digits];
    pasted.split("").forEach((ch, i) => {
      if (i < 6) next[i] = ch;
    });
    setDigits(next);
    const lastFilled = Math.min(pasted.length, 5);
    inputRefs.current[lastFilled]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    setError("");
    setStatus("loading");

    try {
      const token = await getToken();
      if (!token) {
        router.push("/sign-in?redirect=/verify-email");
        return;
      }

      const response = await fetch(`${getApiUrl()}/auth/verify-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const data = await response.json() as { message?: string };
        throw new Error(data.message || "Verification failed");
      }

      setStatus("success");
      setTimeout(() => router.push("/"), 2000);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Verification failed");
    }
  };

  const handleResend = async () => {
    setResendStatus("sending");
    try {
      const token = await getToken();
      if (!token) {
        router.push("/sign-in?redirect=/verify-email");
        return;
      }

      const response = await fetch(`${getApiUrl()}/auth/resend-verification`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json() as { message?: string };
        throw new Error(data.message || "Failed to resend code");
      }

      setResendStatus("sent");
      setTimeout(() => setResendStatus("idle"), 30_000);
    } catch (err) {
      setResendStatus("idle");
      setError(err instanceof Error ? err.message : "Failed to resend code");
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="p-4 bg-primary/10 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
            <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Email Verified!</h1>
          <p className="text-muted-foreground">
            Your email has been successfully verified. Redirecting you to the app...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="p-4 bg-primary/10 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Check your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {user?.email
              ? `We sent a 6-digit code to ${user.email}`
              : "We sent a 6-digit verification code to your email"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md text-center">
              {error}
            </div>
          )}

          {resendStatus === "sent" && (
            <div className="p-3 text-sm text-primary bg-primary/10 rounded-md text-center">
              A new code has been sent to your email
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-4 text-center">
              Enter verification code
            </label>
            <div className="flex gap-3 justify-center" onPaste={handlePaste}>
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-12 h-14 text-center text-xl font-bold border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              ))}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={status === "loading" || code.length !== 6}
          >
            {status === "loading" ? "Verifying..." : "Verify Email"}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground space-y-2">
          <p>
            Didn&apos;t receive a code?{" "}
            <button
              type="button"
              onClick={handleResend}
              disabled={resendStatus !== "idle"}
              className="text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendStatus === "sending" ? "Sending..." : resendStatus === "sent" ? "Sent!" : "Resend code"}
            </button>
          </p>
          <p>
            <Link href="/" className="text-primary hover:underline">
              Skip for now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
