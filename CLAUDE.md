# CLAUDE.md — AI Agent Guide

## Project Overview

Turborepo monorepo: Next.js 16 (web) + NestJS (backend) + Expo SDK 55 (mobile) + shared packages.
Package manager: **pnpm**. Always use pnpm, never npm/yarn.

## Komendy deweloperskie

```bash
# Setup (pierwsze uruchomienie)
pnpm dev:setup          # kopiuje .env, uruchamia Docker (Postgres + Redis), migracje, seed

# Uruchamianie
pnpm dev                # wszystkie serwery naraz (backend :3001, web :3000, metro)
pnpm dev:backend        # tylko NestJS
pnpm dev:web            # tylko Next.js
pnpm dev:mobile         # tylko Expo

# Build
pnpm build              # buduje cały monorepo (Turborepo)

# Testy
pnpm test               # wszystkie testy (Jest)
pnpm test:cov           # z pokryciem kodu
pnpm test:e2e           # testy E2E (Playwright, tylko web)

# Baza danych
pnpm db:setup           # setup Postgres przez Docker
pnpm db:seed            # seed danych testowych

# Inne
pnpm lint               # ESLint dla całego monorepo
pnpm type-check         # TypeScript check
pnpm inspect:envs       # wyświetla wszystkie zmienne .env z wszystkich apps/packages
pnpm format             # Prettier
```

## Struktura projektu

```
apps/
  backend/     # NestJS API — port 3001
  web/         # Next.js App Router — port 3000
  mobile/      # Expo React Native (Expo Router)
packages/
  db/          # TypeORM encje + migracje + seed (PostgreSQL)
  services/    # Współdzielone serwisy: auth (JWT), redis
  trpc/        # tRPC routery + kontekst (wspólne dla backend/web/mobile)
  ui/          # Współdzielone komponenty, tokeny designu, CSS
  analytics/   # PostHog wrapper
  websockets/  # Type-safe Socket.IO (server + client)
  eslint-config/
  typescript-config/
```

## Architektura API

- **tRPC** — główny protokół API (end-to-end typesafe)
  - Routery: `packages/trpc/src/routers/` → `auth.router.ts`, `basic.router.ts`, `chatroom.router.ts`
  - Dodając nowy router: utwórz plik w `packages/trpc/src/routers/`, zarejestruj w `packages/trpc/src/routers/index.ts`
- **REST** — tylko dla health checka i tRPC panel (`/trpc-panel` w dev)
- **WebSockets** — Socket.IO z type-safe events w `packages/websockets/`

## Autentykacja

- **Typ**: Custom JWT + Refresh Token (NIE Clerk, NIE NextAuth)
- **Tokeny**: Access 15min (httpOnly cookie), Refresh 7d (httpOnly cookie)
- **Backend guard**: `JwtAuthGuard` — globalny (domyślnie wszystkie endpointy chronione)
  - Aby odblokować endpoint: `@Public()` dekorator
- **Middleware web**: `apps/web/src/middleware.ts` — sprawdza obecność `refresh_token` cookie (nie waliduje JWT — to robi API)
- **Web hook**: `useAuth()` z `apps/web/src/providers/auth-provider.tsx`
- **Mobile storage**: `expo-secure-store` w `apps/mobile/providers/AuthProvider.tsx`
- **RBAC**: `RolesGuard` + `@Roles()` dekorator, encja `Role` w `packages/db/src/entities/`
- **Bcrypt**: 12 rund (hasła)

## Baza danych

- **ORM**: TypeORM z PostgreSQL
- **Encje**: `packages/db/src/entities/` — User, Role, Item, ItemDetail, UserItem, VerificationCode
- **Migracje**: `packages/db/src/migrations/` — ZAWSZE twórz migrację przy zmianie schematu
  - Komenda do generowania: `pnpm --filter @repo/db migration:generate -- src/migrations/NazwaMigracji`
  - Komenda do uruchomienia: `pnpm --filter @repo/db migration:run`
- **Seed**: `packages/db/src/seed/` — dane testowe

## UI i stylowanie

### Web (Next.js)
- **Tailwind CSS v4** (NIE v3!) — konfiguracja przez CSS `@theme` block
- **shadcn-style** — komponenty w `packages/ui/src/components/base/` (Radix UI + CVA)
- **Dark mode**: `next-themes`, klasa `.dark` na `<html>`, toggle w Navbar
- Shared CSS: `packages/ui/src/styles/theme.css` (tokeny) + `default.css` (dark overrides)

### Mobile (Expo)
- **NativeWind v4** (Tailwind v3 preset — inne niż web!)
- **GlueStack UI v2** — pattern: `tva` z `@gluestack-ui/nativewind-utils/tva`
- **BEZ GlueStack Provider** — v2 nie wymaga
- Konfiguracja: `apps/mobile/tailwind.config.js`

### Design tokens (wspólne)
- `packages/ui/src/tokens/index.ts` — kolory, spacing, radius, typography
- **Tylko 3 kolory**: background (white/#09090b), foreground/primary (black), muted/accent (gray)
- Destructive: red (`#ef4444`) — tylko dla błędów
- Font: **Inter**

## Konwencje kodowania

- **TypeScript strict** — brak `any`, używaj typów z tRPC (`RouterInputs`, `RouterOutputs`)
- **Pliki testów**: `*.spec.ts` obok testowanego pliku (nie w osobnym folderze `test/`)
- **Importy**: zawsze z rozszerzeniem `.js` w NestJS/Node (ESM)
- **Zmienne środowiskowe backend**: walidowane przez Joi w `apps/backend/src/config/validation.schema.ts` — każda nowa zmienna musi być tam dodana
- **Nowe pakiety**: dodaj do odpowiedniego `apps/` lub `packages/` przez `pnpm --filter @repo/nazwa add pakiet`

## Często popełniane błędy (UNIKAJ)

1. **Nie mieszaj Tailwind v3 (mobile) z v4 (web)** — osobne konfiguracje, różna składnia
2. **Nie używaj `JWT_SECRET` w web middleware do walidacji** — middleware tylko sprawdza obecność refresh_token cookie, walidacja w API
3. **Nie dodawaj `GlueStackProvider`** do mobile — GlueStack v2 z NativeWind nie wymaga
4. **Nie commituj `.env`** — tylko `.env.example`
5. **Przy zmianie encji DB** — zawsze generuj migrację, nie edytuj istniejących migracji
6. **tRPC routery muszą być `@Injectable()`** — to NestJS serwisy

## Publiczne ścieżki web (nie wymagają auth)

`/`, `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/verify-email`
Zdefiniowane w `apps/web/src/middleware.ts` — aktualizuj przy dodawaniu nowych publicznych stron.

## Porty deweloperskie

- Backend (NestJS): `http://localhost:3001`
- Web (Next.js): `http://localhost:3000`
- tRPC Panel (dev): `http://localhost:3001/trpc-panel`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
