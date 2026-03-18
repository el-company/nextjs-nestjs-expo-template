import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  ScrollView,
} from "react-native";
import { useAuth } from "../providers/AuthProvider";
import { useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "../utils/api";

type Mode = "signin" | "signup" | "forgot" | "verify" | "reset-code";

export function Auth() {
  const { isAuthenticated, user, login, register, logout, isLoading, getToken } = useAuth();
  const queryClient = useQueryClient();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [codeDigits, setCodeDigits] = useState(["", "", "", "", "", ""]);
  const codeRefs = useRef<(TextInput | null)[]>([]);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");

  const code = codeDigits.join("");
  const styles = createStyles(isDark);

  const handleCodeDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...codeDigits];
    next[index] = digit;
    setCodeDigits(next);
    if (digit && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyPress = (index: number, key: string) => {
    if (key === "Backspace" && !codeDigits[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) { setError("Please fill in all fields"); return; }
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      queryClient.invalidateQueries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !username) { setError("Please fill in all required fields"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    setError("");
    setSubmitting(true);
    try {
      await register({ email, password, username, firstName: firstName || undefined, lastName: lastName || undefined });
      queryClient.invalidateQueries();
      setMode("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) { setError("Please enter your email"); return; }
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch(`${getApiUrl()}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const data = await response.json() as { message?: string };
        throw new Error(data.message || "Failed to send reset code");
      }
      setMode("reset-code");
      setCodeDigits(["", "", "", "", "", ""]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (code.length !== 6) { setError("Please enter the complete 6-digit code"); return; }
    setError("");
    setSubmitting(true);
    try {
      const token = await getToken();
      if (!token) { setError("Session expired. Please sign in again."); return; }
      const response = await fetch(`${getApiUrl()}/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code }),
      });
      if (!response.ok) {
        const data = await response.json() as { message?: string };
        throw new Error(data.message || "Verification failed");
      }
      queryClient.invalidateQueries();
      // Refresh user data after verification
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    setResendStatus("sending");
    try {
      const token = await getToken();
      if (!token) return;
      const response = await fetch(`${getApiUrl()}/auth/resend-verification`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to resend");
      setResendStatus("sent");
      setTimeout(() => setResendStatus("idle"), 30_000);
    } catch {
      setResendStatus("idle");
    }
  };

  const handleResetPassword = async () => {
    if (code.length !== 6) { setError("Please enter the complete 6-digit code"); return; }
    if (!password) { setError("Please enter a new password"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch(`${getApiUrl()}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword: password }),
      });
      if (!response.ok) {
        const data = await response.json() as { message?: string };
        throw new Error(data.message || "Failed to reset password");
      }
      setMode("signin");
      setPassword("");
      setConfirmPassword("");
      setCodeDigits(["", "", "", "", "", ""]);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      queryClient.invalidateQueries();
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={isDark ? "#fff" : "#000"} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // ── Verify email ────────────────────────────────────────────────────────
  if (mode === "verify") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Verify Email</Text>
        <Text style={styles.description}>
          Enter the 6-digit code sent to {email || user?.email || "your email"}
        </Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.codeRow}>
          {codeDigits.map((digit, i) => (
            <TextInput
              key={i}
              ref={(el) => { codeRefs.current[i] = el; }}
              style={styles.codeInput}
              value={digit}
              onChangeText={(v) => handleCodeDigit(i, v)}
              onKeyPress={({ nativeEvent }) => handleCodeKeyPress(i, nativeEvent.key)}
              keyboardType="numeric"
              maxLength={1}
              selectTextOnFocus
              placeholderTextColor={isDark ? "#555" : "#bbb"}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleVerifyEmail}
          disabled={submitting || code.length !== 6}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify Email</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={handleResendVerification}
          disabled={resendStatus !== "idle"}
        >
          <Text style={[styles.linkText, resendStatus !== "idle" && styles.linkDisabled]}>
            {resendStatus === "sending" ? "Sending..." : resendStatus === "sent" ? "Code sent!" : "Resend code"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={() => setMode("signin")}>
          <Text style={styles.linkText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isAuthenticated && user) {
    return (
      <View style={styles.container}>
        <Text style={styles.welcomeText}>Welcome, {user.firstName || user.username}!</Text>
        <Text style={styles.emailText}>{user.email}</Text>
        {!user.isEmailVerified && (
          <TouchableOpacity
            style={styles.warningButton}
            onPress={() => setMode("verify")}
          >
            <Text style={styles.warningText}>⚠ Email not verified — tap to verify</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.button} onPress={handleSignOut}>
          <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Reset password (enter code + new password) ─────────────────────────
  if (mode === "reset-code") {
    return (
      <ScrollView>
        <View style={styles.container}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.description}>
            Enter the 6-digit code sent to {email} and your new password
          </Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.codeRow}>
            {codeDigits.map((digit, i) => (
              <TextInput
                key={i}
                ref={(el) => { codeRefs.current[i] = el; }}
                style={styles.codeInput}
                value={digit}
                onChangeText={(v) => handleCodeDigit(i, v)}
                onKeyPress={({ nativeEvent }) => handleCodeKeyPress(i, nativeEvent.key)}
                keyboardType="numeric"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="New Password"
            placeholderTextColor={isDark ? "#666" : "#999"}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm New Password"
            placeholderTextColor={isDark ? "#666" : "#999"}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={submitting || code.length !== 6}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Reset Password</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkButton} onPress={() => { setMode("forgot"); setCodeDigits(["", "", "", "", "", ""]); }}>
            <Text style={styles.linkText}>Request a new code</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ── Forgot password (enter email) ──────────────────────────────────────
  if (mode === "forgot") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Forgot Password</Text>
        <Text style={styles.description}>Enter your email to receive a reset code</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={isDark ? "#666" : "#999"}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleForgotPassword}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Reset Code</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={() => setMode("signin")}>
          <Text style={styles.linkText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Sign in / Sign up ──────────────────────────────────────────────────
  return (
    <ScrollView>
      <View style={styles.container}>
        <Text style={styles.title}>{mode === "signin" ? "Sign In" : "Create Account"}</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {mode === "signup" && (
          <>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="First Name"
                placeholderTextColor={isDark ? "#666" : "#999"}
                value={firstName}
                onChangeText={setFirstName}
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Last Name"
                placeholderTextColor={isDark ? "#666" : "#999"}
                value={lastName}
                onChangeText={setLastName}
              />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Username *"
              placeholderTextColor={isDark ? "#666" : "#999"}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </>
        )}

        <TextInput
          style={styles.input}
          placeholder="Email *"
          placeholderTextColor={isDark ? "#666" : "#999"}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Password *"
          placeholderTextColor={isDark ? "#666" : "#999"}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {mode === "signup" && (
          <TextInput
            style={styles.input}
            placeholder="Confirm Password *"
            placeholderTextColor={isDark ? "#666" : "#999"}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        )}

        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={mode === "signin" ? handleSignIn : handleSignUp}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {mode === "signin" ? "Sign In" : "Create Account"}
            </Text>
          )}
        </TouchableOpacity>

        {mode === "signin" && (
          <TouchableOpacity style={styles.linkButton} onPress={() => setMode("forgot")}>
            <Text style={styles.linkText}>Forgot password?</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }}
        >
          <Text style={styles.linkText}>
            {mode === "signin" ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      padding: 16,
      backgroundColor: isDark ? "#18181b" : "#ffffff",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? "#27272a" : "#e4e4e7",
    },
    title: {
      fontSize: 20,
      fontWeight: "bold",
      marginBottom: 8,
      color: isDark ? "#fafafa" : "#09090b",
      textAlign: "center",
    },
    description: {
      fontSize: 14,
      color: isDark ? "#a1a1aa" : "#71717a",
      textAlign: "center",
      marginBottom: 20,
    },
    welcomeText: {
      fontSize: 18,
      fontWeight: "600",
      color: isDark ? "#fafafa" : "#09090b",
      marginBottom: 4,
    },
    emailText: {
      fontSize: 14,
      color: isDark ? "#a1a1aa" : "#71717a",
      marginBottom: 16,
    },
    warningButton: {
      marginBottom: 16,
    },
    warningText: {
      fontSize: 13,
      color: "#f59e0b",
      textAlign: "center",
    },
    loadingText: {
      marginTop: 8,
      color: isDark ? "#a1a1aa" : "#71717a",
    },
    errorText: {
      color: "#ef4444",
      fontSize: 14,
      marginBottom: 12,
      textAlign: "center",
    },
    input: {
      height: 44,
      borderWidth: 1,
      borderColor: isDark ? "#27272a" : "#e4e4e7",
      borderRadius: 6,
      marginBottom: 12,
      paddingHorizontal: 12,
      backgroundColor: isDark ? "#09090b" : "#ffffff",
      color: isDark ? "#fafafa" : "#09090b",
      fontSize: 16,
    },
    row: {
      flexDirection: "row",
      gap: 8,
    },
    halfInput: {
      flex: 1,
    },
    codeRow: {
      flexDirection: "row",
      gap: 8,
      justifyContent: "center",
      marginBottom: 20,
    },
    codeInput: {
      width: 44,
      height: 52,
      borderWidth: 1,
      borderColor: isDark ? "#27272a" : "#e4e4e7",
      borderRadius: 6,
      textAlign: "center",
      fontSize: 22,
      fontWeight: "700",
      color: isDark ? "#fafafa" : "#09090b",
      backgroundColor: isDark ? "#09090b" : "#ffffff",
    },
    button: {
      backgroundColor: "#09090b",
      paddingVertical: 12,
      borderRadius: 6,
      alignItems: "center",
      marginTop: 4,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    buttonText: {
      color: "#fafafa",
      fontSize: 16,
      fontWeight: "500",
    },
    linkButton: {
      marginTop: 12,
      alignItems: "center",
    },
    linkText: {
      color: "#3b82f6",
      fontSize: 14,
    },
    linkDisabled: {
      opacity: 0.5,
    },
  });
