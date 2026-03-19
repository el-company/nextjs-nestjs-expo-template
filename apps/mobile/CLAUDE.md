# CLAUDE.md — Mobile (Expo)

## Stack
- Expo SDK 55 z Expo Router (file-based routing)
- React Native
- NativeWind v4 (Tailwind **v3** preset — INNE niż web!)
- GlueStack UI v2 (NIE wymaga GlueStackProvider)
- `expo-secure-store` (JWT storage)
- tRPC client
- Redux Toolkit + TanStack Query
- PostHog analytics

## Komendy

```bash
pnpm dev:mobile           # uruchamia Metro bundler
pnpm --filter @repo/mobile build   # EAS Build
```

## Struktura

```
apps/mobile/
  App.tsx               # Entry point: rejestruje providery, importuje global.css
  app.config.ts         # Expo config (dynamiczny)
  global.css            # NativeWind CSS (importowany w App.tsx)
  tailwind.config.js    # Tailwind v3 z NativeWind preset
  metro.config.js       # Metro z withNativeWind wrapper
  nativewind-env.d.ts   # Typy NativeWind
  components/
    Auth.tsx            # Ekran logowania/rejestracji
    Button.tsx          # Podstawowy komponent Button
    ChatDemo.tsx        # Demo chat WebSockets
    GlueStackDemo.tsx   # Demo GlueStack UI
    SafeAreaWrapper.tsx # SafeAreaView wrapper
  providers/
    AuthProvider.tsx    # Auth state + expo-secure-store
    TRPCProvider.tsx    # tRPC + React Query
    ReduxProvider.tsx   # Redux store
    PostHogProvider.tsx # Analytics
  hooks/                # Custom hooks
  services/             # API calls
  store/                # Redux slices
  utils/
```

## Stylowanie — NativeWind v4 + Tailwind v3

**WAŻNE**: Mobile używa Tailwind **v3**, web używa v4 — nie przenoś klas między nimi bez sprawdzenia.

```tsx
// Używaj className jak w Tailwind
<View className="flex-1 bg-white dark:bg-zinc-950 p-4">
  <Text className="text-zinc-900 dark:text-white font-semibold">Tytuł</Text>
</View>
```

### GlueStack UI v2 — wzorzec komponentów

```tsx
import { tva } from "@gluestack-ui/nativewind-utils/tva";

const buttonStyle = tva({
  base: "rounded-lg px-4 py-2 bg-zinc-900 dark:bg-white",
  variants: {
    size: {
      sm: "px-3 py-1.5",
      md: "px-4 py-2",
      lg: "px-6 py-3",
    }
  }
});

// BEZ GlueStackProvider — nie dodawaj go!
```

## Autentykacja

```tsx
// Użyj hooka
import { useAuth } from "../providers/AuthProvider";
const { user, login, logout, isLoading } = useAuth();

// Tokeny przechowywane w expo-secure-store (nie AsyncStorage)
```

## tRPC — użycie

```tsx
import { trpc } from "../providers/TRPCProvider";

function Screen() {
  const { data } = trpc.auth.me.useQuery();
}
```

## Dark mode

```tsx
import { useColorScheme } from "react-native";
const colorScheme = useColorScheme(); // 'light' | 'dark' | null

// Lub przez NativeWind klasy:
<View className="bg-white dark:bg-zinc-950" />
```

## Dodawanie nowego ekranu (Expo Router)

1. Utwórz plik w `app/nazwa.tsx` lub `app/folder/index.tsx`
2. Expo Router automatycznie rejestruje trasę
3. Dla chronionych tras: sprawdź `useAuth()` i przekieruj jeśli niezalogowany

## Zmienne środowiskowe

- Prefix `EXPO_PUBLIC_` — dostępne w kodzie aplikacji
- Wczytywane przez Expo config (`app.config.ts`)
- Dodaj każdą nową zmienną do `.env.example`

## Znane ograniczenia

- Font Inter: **nie załadowany** przez `expo-font` — używa systemowego fontu (TODO)
- EAS config: `eas.json` — skonfiguruj przed pierwszym buildem produkcyjnym
