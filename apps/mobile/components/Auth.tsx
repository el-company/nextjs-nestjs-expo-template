import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { useAuth } from "../providers/AuthProvider";
import { useQueryClient } from "@tanstack/react-query";

export function Auth() {
  const { isAuthenticated, user, login, register, logout, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      await login(email, password);
      queryClient.invalidateQueries();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign in failed";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !username) {
      setError("Please fill in all required fields");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      await register({
        email,
        password,
        username,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      });
      queryClient.invalidateQueries();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign up failed";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      // Get API URL from env
      const apiUrl = "http://localhost:3001"; // You should get this from env
      const response = await fetch(`${apiUrl}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to send reset email");
      }

      setForgotSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Request failed";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      queryClient.invalidateQueries();
    } catch (err: unknown) {
      console.error("Error signing out:", err);
    }
  };

  const styles = createStyles(isDark);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={isDark ? "#fff" : "#000"} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (isAuthenticated && user) {
    return (
      <View style={styles.container}>
        <Text style={styles.welcomeText}>
          Welcome, {user.firstName || user.username}!
        </Text>
        <Text style={styles.emailText}>{user.email}</Text>
        {!user.isEmailVerified && (
          <Text style={styles.warningText}>
            Please verify your email address
          </Text>
        )}
        <TouchableOpacity style={styles.button} onPress={handleSignOut}>
          <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (mode === "forgot") {
    if (forgotSuccess) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Check Your Email</Text>
          <Text style={styles.description}>
            If an account exists with {email}, you will receive a password reset
            link shortly.
          </Text>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => {
              setMode("signin");
              setForgotSuccess(false);
            }}
          >
            <Text style={styles.linkText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Forgot Password</Text>
        <Text style={styles.description}>
          Enter your email and we&apos;ll send you a reset link
        </Text>

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
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Send Reset Link</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => setMode("signin")}
        >
          <Text style={styles.linkText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {mode === "signin" ? "Sign In" : "Create Account"}
      </Text>

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
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => setMode("forgot")}
        >
          <Text style={styles.linkText}>Forgot password?</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError("");
        }}
      >
        <Text style={styles.linkText}>
          {mode === "signin"
            ? "Don't have an account? Sign Up"
            : "Already have an account? Sign In"}
        </Text>
      </TouchableOpacity>
    </View>
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
      marginBottom: 16,
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
    warningText: {
      fontSize: 12,
      color: "#f59e0b",
      marginBottom: 16,
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
  });
