import "./global.css";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, ReactNode, ErrorInfo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Platform,
  useColorScheme,
  TouchableOpacity,
} from "react-native";
import { SafeAreaWrapper } from "./components/SafeAreaWrapper";
import { TRPCProvider } from "./providers/TRPCProvider";
import { HelloExample } from "./components/HelloExample";
import { ChatDemo } from "./components/ChatDemo";
import { CustomClerkProvider } from "./providers/ClerkProvider";
import { PostHogProvider } from "./providers/PostHogProvider";
import { ReduxProvider } from "./providers/ReduxProvider";
import { ClerkAuth } from "./components/ClerkAuth";
import { GlueStackDemo } from "./components/GlueStackDemo";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("App Error:", error);
    console.error("Error Info:", errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>
            {this.state.error?.toString()}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const colorScheme = useColorScheme();
  const [activeView, setActiveView] = useState<"main" | "chat">("main");

  useEffect(() => {
    console.log("[App] Mounted - React version:", React.version);
    console.log("[App] Platform:", Platform.OS, Platform.Version);
    console.log("[App] Color scheme:", colorScheme);
  }, [colorScheme]);

  const isDark = colorScheme === "dark";

  const renderMainContent = () => (
    <ScrollView contentContainerStyle={styles.scrollView}>
      <View style={[styles.container, isDark && styles.containerDark]}>
        <Text style={[styles.title, isDark && styles.textDark]}>
          Mobile App
        </Text>
        <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>
          Welcome to the demo app
        </Text>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
            Authentication:
          </Text>
          <ClerkAuth />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
            tRPC Demo:
          </Text>
          <HelloExample />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
            Chat Demo:
          </Text>
          <View style={[styles.chatPreview, isDark && styles.chatPreviewDark]}>
            <Text style={isDark && styles.textDark}>
              Open the chat interface to start messaging
            </Text>
            <AppButton onPress={() => setActiveView("chat")}>
              Open Chat
            </AppButton>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
            GlueStack UI Demo:
          </Text>
          <GlueStackDemo />
        </View>
      </View>
    </ScrollView>
  );

  const renderChatContent = () => (
    <View style={[styles.chatContainer, isDark && styles.containerDark]}>
      <View style={[styles.chatHeader, isDark && styles.chatHeaderDark]}>
        <AppButton onPress={() => setActiveView("main")} secondary>
          Back to Main
        </AppButton>
        <Text style={[styles.chatTitle, isDark && styles.textDark]}>Chat</Text>
      </View>
      <ChatDemo />
    </View>
  );

  return (
    <ErrorBoundary>
      <ReduxProvider>
        <CustomClerkProvider>
          <PostHogProvider>
            <TRPCProvider>
              <SafeAreaWrapper
                style={[styles.safeArea, isDark && styles.containerDark]}
                key="main-safe-area"
              >
                <StatusBar style={isDark ? "light" : "dark"} />
                {activeView === "main"
                  ? renderMainContent()
                  : renderChatContent()}
              </SafeAreaWrapper>
            </TRPCProvider>
          </PostHogProvider>
        </CustomClerkProvider>
      </ReduxProvider>
    </ErrorBoundary>
  );
}

function AppButton({
  onPress,
  children,
  secondary,
}: {
  onPress: () => void;
  children: React.ReactNode;
  secondary?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.button,
        secondary ? styles.buttonSecondary : styles.buttonPrimary,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          secondary ? styles.buttonTextSecondary : styles.buttonTextPrimary,
        ]}
      >
        {children}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollView: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
  },
  containerDark: {
    backgroundColor: "#09090b",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#09090b",
  },
  textDark: {
    color: "#fafafa",
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 30,
    color: "#71717a",
  },
  subtitleDark: {
    color: "#a1a1aa",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    alignSelf: "flex-start",
    color: "#09090b",
  },
  section: {
    width: "100%",
    marginBottom: 20,
    marginTop: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ef4444",
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: "#09090b",
    textAlign: "center",
  },
  chatContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e4e4e7",
    gap: 12,
  },
  chatHeaderDark: {
    borderBottomColor: "#27272a",
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#09090b",
  },
  chatPreview: {
    width: "100%",
    padding: 16,
    backgroundColor: "#f4f4f5",
    borderRadius: 8,
    alignItems: "center",
    gap: 12,
  },
  chatPreviewDark: {
    backgroundColor: "#27272a",
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 8,
  },
  buttonPrimary: {
    backgroundColor: "#09090b",
  },
  buttonSecondary: {
    backgroundColor: "#f4f4f5",
    borderWidth: 1,
    borderColor: "#e4e4e7",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  buttonTextPrimary: {
    color: "#fafafa",
  },
  buttonTextSecondary: {
    color: "#09090b",
  },
});
