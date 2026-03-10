import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  useColorScheme,
} from "react-native";

export function GlueStackDemo() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const t = isDark ? dark : light;

  return (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
      {/* Header */}
      <View style={styles.section}>
        <Text style={[styles.title, { color: t.foreground }]}>GlueStack UI Demo</Text>
        <Text style={[styles.subtitle, { color: t.muted }]}>NativeWind v4 + StyleSheet</Text>
      </View>

      {/* Badges */}
      <View style={styles.row}>
        <View style={[styles.badge, { backgroundColor: t.primary }]}>
          <Text style={[styles.badgeText, { color: t.primaryFg }]}>Primary</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: t.secondary }]}>
          <Text style={[styles.badgeText, { color: t.secondaryFg }]}>Secondary</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: t.muted }]}>
          <Text style={[styles.badgeText, { color: t.mutedFg }]}>Muted</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: "#ef4444" }]}>
          <Text style={[styles.badgeText, { color: "#fafafa" }]}>Error</Text>
        </View>
      </View>

      {/* Counter */}
      <View style={[styles.counterRow]}>
        <Pressable
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: t.secondary, borderColor: t.border, borderWidth: 1 },
            pressed && styles.pressed,
          ]}
          onPress={() => setCount((c) => Math.max(0, c - 1))}
        >
          <Text style={[styles.btnText, { color: t.foreground }]}>−</Text>
        </Pressable>
        <Text style={[styles.counter, { color: t.foreground }]}>{count}</Text>
        <Pressable
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: t.primary },
            pressed && styles.pressed,
          ]}
          onPress={() => setCount((c) => c + 1)}
        >
          <Text style={[styles.btnText, { color: t.primaryFg }]}>+</Text>
        </Pressable>
      </View>

      {/* Input */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: t.foreground }]}>Your name</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: t.background,
              borderColor: inputFocused ? t.ring : t.border,
              color: t.foreground,
            },
          ]}
          placeholder="Enter your name…"
          placeholderTextColor={t.muted}
          value={name}
          onChangeText={setName}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
        />
        {name ? (
          <Text style={[styles.hint, { color: t.muted }]}>Hello, {name}!</Text>
        ) : null}
      </View>

      {/* Action buttons */}
      <View style={styles.btnRow}>
        <Pressable
          style={({ pressed }) => [
            styles.btn,
            styles.btnFlex,
            { backgroundColor: t.primary },
            pressed && styles.pressed,
          ]}
          onPress={() => { setCount(0); setName(""); }}
        >
          <Text style={[styles.btnText, { color: t.primaryFg }]}>Reset</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.btn,
            styles.btnFlex,
            { backgroundColor: t.secondary, borderColor: t.border, borderWidth: 1 },
            pressed && styles.pressed,
          ]}
          onPress={() => setCount((c) => c + 10)}
        >
          <Text style={[styles.btnText, { color: t.foreground }]}>+10</Text>
        </Pressable>
      </View>
    </View>
  );
}

const light = {
  background: "#ffffff",
  foreground: "#09090b",
  card: "#f4f4f5",
  primary: "#09090b",
  primaryFg: "#fafafa",
  secondary: "#ffffff",
  secondaryFg: "#09090b",
  muted: "#71717a",
  mutedFg: "#71717a",
  border: "#e4e4e7",
  ring: "#09090b",
};

const dark = {
  background: "#09090b",
  foreground: "#fafafa",
  card: "#18181b",
  primary: "#fafafa",
  primaryFg: "#09090b",
  secondary: "#27272a",
  secondaryFg: "#fafafa",
  muted: "#71717a",
  mutedFg: "#a1a1aa",
  border: "#27272a",
  ring: "#fafafa",
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  section: {
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 13,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 4,
  },
  hint: {
    fontSize: 13,
    marginTop: 4,
  },
  // Badges
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  // Counter
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  counter: {
    fontSize: 18,
    fontWeight: "600",
    minWidth: 32,
    textAlign: "center",
  },
  // Input
  input: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  // Buttons
  btn: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  btnFlex: {
    flex: 1,
  },
  btnRow: {
    flexDirection: "row",
    gap: 8,
  },
  btnText: {
    fontSize: 14,
    fontWeight: "500",
  },
  pressed: {
    opacity: 0.75,
  },
});
