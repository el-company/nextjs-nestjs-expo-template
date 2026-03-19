# CLAUDE.md — Web (Next.js)

## Stack
- Next.js 16 App Router (RSC + Server Actions)
- Tailwind CSS **v4** (NIE v3!)
- shadcn-style UI: Radix UI + CVA (komponenty w `packages/ui`)
- tRPC client
- Redux Toolkit + TanStack Query (React Query)
- `next-themes` (dark/light mode)
- `jose` (JWT w middleware)
- PostHog analytics

## Komendy

```bash
pnpm dev:web
pnpm --filter @repo/web build
pnpm --filter @repo/web test
pnpm test:e2e         # Playwright (z root)
```

## Struktura `src/`

```
src/
  app/                  # Next.js App Router
    (auth)/             # Route group: sign-in, sign-up, forgot-password, reset-password, verify-email
    chat/               # Przykładowy chat (WebSockets)
    demo/               # Demo tRPC + auth
    profile/            # Profil użytkownika
    layout.tsx          # Root layout: ThemeProvider, TRPCProvider, AuthProvider, PostHog
    page.tsx            # Strona główna
  components/
    navbar.tsx          # Navbar z theme toggle (sun/moon SVG)
    auth-status.tsx     # Status zalogowania
    error-boundary.tsx
  providers/
    auth-provider.tsx   # useAuth() hook — login, register, logout, getToken
    trpc-provider.tsx   # tRPC + React Query provider
    theme-provider.tsx  # next-themes ThemeProvider
  hooks/                # Custom React hooks
  services/             # Logika API po stronie klienta
  store/                # Redux Toolkit store
  types/                # Typy TypeScript
  utils/                # Helpers
  middleware.ts         # Auth middleware (sprawdza refresh_token cookie)
  env.ts                # Walidacja zmiennych env (zod lub podobne)
```

## Stylowanie — Tailwind v4

- **Konfiguracja przez CSS** — `packages/ui/src/styles/theme.css` (`@theme` block)
- **BEZ `tailwind.config.js`** — v4 nie używa pliku konfiguracyjnego (lub minimalny)
- Dark mode: klasa `.dark` na `<html>` (przez `next-themes`)
- `suppressHydrationWarning` na `<html>` — zapobiega FOUC

### Używanie komponentów

```tsx
// Komponenty z packages/ui
import { Button } from "@repo/ui/components/base/button";

// CVA variants
import { buttonVariants } from "@repo/ui/components/base/button";
```

## Autentykacja

```tsx
// Pobierz dane i metody auth
const { user, isLoading, login, logout, register } = useAuth();

// Middleware automatycznie chroni trasy — nie musisz sprawdzać w każdej stronie
// Publiczne trasy: /, /sign-in, /sign-up, /forgot-password, /reset-password, /verify-email
```

## tRPC — użycie

```tsx
// Client Component
"use client";
import { trpc } from "@/providers/trpc-provider";

function Component() {
  const { data } = trpc.auth.me.useQuery();
  const mutation = trpc.chatroom.sendMessage.useMutation();
}

// Server Component — przez fetch lub server-side tRPC caller
```

## Dark mode

```tsx
// Toggle theme
import { useTheme } from "next-themes";
const { theme, setTheme } = useTheme();
setTheme(theme === "dark" ? "light" : "dark");
```

## Dodawanie nowej strony

1. Utwórz folder w `src/app/nazwa/page.tsx`
2. Jeśli wymaga auth — nic nie rób (middleware chroni domyślnie)
3. Jeśli publiczna — dodaj ścieżkę do `publicRoutes` w `src/middleware.ts`

## Zmienne środowiskowe

```
NEXT_PUBLIC_*   — dostępne po stronie klienta (bundle)
JWT_SECRET      — tylko serwer (middleware)
```

Dodaj każdą nową zmienną do `.env.example` i `src/env.ts`.
