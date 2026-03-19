# Web App (Next.js)

This Next.js application provides the web interface for the platform, built with the App Router and a full provider architecture for authentication, real-time communication, and analytics.

## Features

- Next.js 16 App Router with React 19
- Custom JWT authentication with email verification and password reset
- Type-safe API communication with tRPC
- Real-time chat with Socket.IO (Redux-managed state)
- UI components with Tailwind CSS v4 + Radix UI (shadcn-style)
- Dark/light theme with `next-themes`
- Analytics tracking with PostHog
- E2E testing with Playwright, unit testing with Jest

## Development

```bash
# From the web directory
pnpm run dev

# Or from the root directory
pnpm run dev:web
```

## Project Structure

```text
web/
├── src/
│   ├── app/                    # Next.js App Router (file-based routing)
│   │   ├── (auth)/             # Auth route group
│   │   │   ├── sign-in/
│   │   │   ├── sign-up/
│   │   │   ├── forgot-password/
│   │   │   ├── reset-password/
│   │   │   └── verify-email/
│   │   ├── chat/               # Real-time chat page
│   │   ├── demo/               # Demo/showcase page
│   │   ├── profile/            # Protected user profile page
│   │   ├── layout.tsx          # Root layout with providers
│   │   └── page.tsx            # Home page
│   ├── components/
│   │   ├── chat/               # Chat room and room selector components
│   │   ├── examples/           # tRPC usage demos
│   │   ├── demos/              # Feature demos
│   │   └── navbar.tsx          # Navigation with theme toggle
│   ├── providers/              # React context providers
│   │   ├── auth-provider.tsx   # JWT auth context (useAuth hook)
│   │   ├── trpc-provider.tsx   # tRPC + TanStack Query setup
│   │   ├── theme-provider.tsx  # next-themes integration
│   │   ├── redux-provider.tsx  # Redux Toolkit store
│   │   └── posthog-provider.tsx# Analytics provider
│   ├── hooks/
│   │   └── use-socket.ts       # Socket.IO Redux hooks
│   ├── services/
│   │   └── socket-service.ts   # Socket.IO client (singleton)
│   ├── store/
│   │   ├── index.ts            # Redux store configuration
│   │   └── socket-slice.ts     # Socket state, async thunks
│   ├── utils/
│   │   ├── trpc.ts             # tRPC client initialization
│   │   └── logger.ts
│   ├── styles/
│   │   └── globals.css         # Global styles + Tailwind v4 imports
│   ├── middleware.ts            # Route protection middleware
│   └── env.ts                  # Type-safe env validation (t3-oss)
├── tests/                      # Playwright E2E tests
├── .env.example                # Example environment variables
├── next.config.js              # Next.js configuration
├── postcss.config.mjs          # PostCSS (Tailwind v4)
├── jest.config.js              # Jest configuration
└── components.json             # shadcn-style component config
```

## Package Integrations

### tRPC Integration

Type-safe API calls via the `useTRPC()` hook from `@trpc/tanstack-react-query`:

```tsx
// src/components/examples/hello-example.tsx
import { useTRPC } from '@/utils/trpc';
import { useQuery } from '@tanstack/react-query';

export function HelloExample() {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(trpc.hello.queryOptions({ name: 'World' }));

  if (isLoading) return <div>Loading...</div>;

  return <p>{data?.greeting}</p>;
}
```

The tRPC client is configured in `trpc-provider.tsx` with:
- `httpBatchLink` pointing to `NEXT_PUBLIC_TRPC_URL`
- JWT `Authorization` header from `useAuth().getToken()`
- `superjson` transformer for dates and complex types

### Authentication

Custom JWT auth via `useAuth()` hook from `providers/auth-provider.tsx`:

```tsx
import { useAuth } from '@/providers/auth-provider';

export function ProfileButton() {
  const { user, login, logout, isLoading } = useAuth();

  if (isLoading) return null;

  if (!user) {
    return <button onClick={() => login({ email, password })}>Sign In</button>;
  }

  return (
    <div>
      <span>Welcome, {user.name}</span>
      <button onClick={logout}>Sign Out</button>
    </div>
  );
}
```

**Auth flow:**
- Access token stored in memory (`accessTokenRef`) — never in localStorage
- Refresh token stored in httpOnly cookie (set by backend)
- Auto-refreshes access token when within 60s of expiry
- Concurrent refresh requests are deduplicated
- Middleware (`middleware.ts`) checks for `refresh_token` cookie on protected routes

**Protected routes** (redirect to `/sign-in` if unauthenticated):
- `/chat`, `/profile` and any route not in the public list

**Public routes:** `/`, `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/verify-email`

### WebSockets Integration

Real-time communication via Socket.IO managed in Redux:

```tsx
import { useChatRoom, useChatMessages } from '@/hooks/use-socket';

export function ChatRoom({ roomId }: { roomId: string }) {
  const { joinRoom, leaveRoom, sendMessage, isConnected } = useChatRoom();
  const messages = useChatMessages(roomId);

  useEffect(() => {
    joinRoom(roomId);
    return () => leaveRoom(roomId);
  }, [roomId]);

  return (
    <div>
      {messages.map((msg) => (
        <p key={msg.id}>{msg.content}</p>
      ))}
      <button onClick={() => sendMessage(roomId, 'Hello!')}>Send</button>
    </div>
  );
}
```

**Available hooks:**
- `useSocketStatus()` — connection state
- `useChatRoom()` — join/leave rooms, send messages
- `useChatMessages(roomId)` — messages for a given room
- `useNotifications()` — server notifications
- `useSocketErrors()` — error handling

The `socket-service.ts` singleton manages the underlying Socket.IO client with 5 reconnection attempts.

### Analytics Integration

PostHog is initialized in `providers/posthog-provider.tsx` and automatically identifies users on auth state changes:

```tsx
import posthog from 'posthog-js';

// Track custom events anywhere in the app
function handlePurchase() {
  posthog.capture('purchase_completed', {
    productId: 'plan-pro',
    value: 29.99,
  });
}
```

### Theme (Dark/Light Mode)

Managed by `next-themes` with `attribute="class"` on `<html>`. The Navbar includes a sun/moon toggle:

```tsx
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Toggle
    </button>
  );
}
```

`suppressHydrationWarning` is set on `<html>` in `layout.tsx` to prevent FOUC.

## Provider Nesting Order

The root `layout.tsx` wraps the app in this order:

```
ThemeProvider
  └── AuthProvider
        └── PostHogProvider
              └── ReduxProvider
                    └── AppTRPCProvider
                          └── Navbar + {children}
```

## Environment Setup

1. Copy `.env.example` to `.env`
2. Update the environment variables as needed:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_PATH=/socket.io
NEXT_PUBLIC_TRPC_URL=http://localhost:3001/trpc

JWT_SECRET=your-super-secret-key-minimum-32-characters-long

NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

Environment variables are validated at build/runtime via `src/env.ts` using `@t3-oss/env-nextjs`. Missing required variables will throw at startup.

## Testing

```bash
# Unit tests (Jest)
pnpm test
pnpm test:watch
pnpm test:ci

# E2E tests (Playwright)
pnpm test:e2e
pnpm test:e2e:ui      # Interactive UI mode
pnpm test:e2e:debug   # Debug mode

# Type checking
pnpm type-check
```

## Adding New Features

1. Create pages in `app/` following Next.js App Router file conventions
2. Add reusable components to `components/`
3. Connect to backend APIs using tRPC via `useTRPC()` from `@/utils/trpc`
4. Use Tailwind CSS `className` for styling (v4 — no config file needed)
5. Add Socket.IO functionality using the Redux hooks in `hooks/use-socket.ts`
6. Track important user actions with `posthog.capture()`
