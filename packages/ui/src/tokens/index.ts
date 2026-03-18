/**
 * Shared design tokens — single source of truth for web (CSS vars) and mobile (NativeWind/Tailwind).
 *
 * Philosophy: 3 semantic roles only — background, foreground, muted.
 * "Primary" = black (light) / white (dark) — the inverted base color.
 */

export const colors = {
  // ── Light mode ──────────────────────────────────────────────────────────────
  background: "#ffffff",
  foreground: "#09090b",

  card: "#ffffff",
  cardForeground: "#09090b",

  primary: "#09090b",
  primaryForeground: "#fafafa",

  secondary: "#f4f4f5",
  secondaryForeground: "#09090b",

  muted: "#f4f4f5",
  mutedForeground: "#71717a",

  accent: "#f4f4f5",
  accentForeground: "#09090b",

  destructive: "#ef4444",
  destructiveForeground: "#fafafa",

  border: "#e4e4e7",
  input: "#e4e4e7",
  ring: "#09090b",

  // ── Dark mode ──────────────────────────────────────────────────────────────
  dark: {
    background: "#09090b",
    foreground: "#fafafa",

    card: "#09090b",
    cardForeground: "#fafafa",

    primary: "#fafafa",
    primaryForeground: "#09090b",

    secondary: "#27272a",
    secondaryForeground: "#fafafa",

    muted: "#27272a",
    mutedForeground: "#a1a1aa",

    accent: "#27272a",
    accentForeground: "#fafafa",

    destructive: "#7f1d1d",
    destructiveForeground: "#fafafa",

    border: "#27272a",
    input: "#27272a",
    ring: "#d4d4d8",
  },

  // ── Neutral scale (grays) ──────────────────────────────────────────────────
  neutral: {
    50: "#fafafa",
    100: "#f4f4f5",
    200: "#e4e4e7",
    300: "#d4d4d8",
    400: "#a1a1aa",
    500: "#71717a",
    600: "#52525b",
    700: "#3f3f46",
    800: "#27272a",
    900: "#18181b",
    950: "#09090b",
  },
} as const;

export const radius = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  full: 9999,
} as const;

export const typography = {
  fontFamily: "Inter, sans-serif",
  fontFamilyMono: "ui-monospace, monospace",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 48,
  "3xl": 64,
} as const;
