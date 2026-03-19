# Mobile App (Expo)

This React Native application built with Expo provides a mobile interface for the platform.

## Features

- Cross-platform support (iOS and Android)
- Integration with shared packages
- Type-safe API communication with tRPC
- Real-time functionality with WebSockets
- UI components with NativeWind v4 + GlueStack UI v2
- Analytics tracking

## Development

```bash
# From the mobile directory
pnpm run dev

# Or from the root directory
pnpm run dev:mobile
```

## Package Integrations

### tRPC Integration

The mobile app uses tRPC for type-safe API communication:

```tsx
// app/screens/HomeScreen.tsx
import { trpc } from '../utils/trpc';

export default function HomeScreen() {
  const { data, isLoading } = trpc.users.getProfile.useQuery();
  
  if (isLoading) {
    return <LoadingIndicator />;
  }
  
  return (
    <View>
      <Text>Welcome, {data.name}!</Text>
    </View>
  );
}
```

### WebSockets Integration

Real-time communication using the WebSockets package:

```tsx
// app/utils/socket.ts
import { createTypedSocketClient, ClientEvents, ServerEvents } from '@repo/websockets';

export const socket = createTypedSocketClient('http://your-api-url');

// In your component
import { socket } from '../utils/socket';
import { useEffect, useState } from 'react';

export function ChatScreen({ roomId }) {
  const [messages, setMessages] = useState([]);
  
  useEffect(() => {
    // Join room
    socket.emit(ClientEvents.JOIN_ROOM, roomId);
    
    // Listen for messages
    socket.on(ServerEvents.MESSAGE, (message) => {
      setMessages((prev) => [...prev, message]);
    });
    
    return () => {
      // Leave room on unmount
      socket.emit(ClientEvents.LEAVE_ROOM, roomId);
      socket.off(ServerEvents.MESSAGE);
    };
  }, [roomId]);
  
  // Send message function
  const sendMessage = (content) => {
    socket.emit(ClientEvents.SEND_MESSAGE, {
      roomId,
      content
    });
  };
  
  return (/* Chat UI */);
}
```

### NativeWind + GlueStack UI Component Usage

The app uses NativeWind v4 (Tailwind CSS for React Native) and GlueStack UI v2 for a consistent and performant UI experience:

```tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';

export function ProfileCard({ user }) {
  const [bio, setBio] = useState(user?.bio || '');

  return (
    <View className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <Text className="text-xl font-semibold text-zinc-900 dark:text-white">
        {user?.name || 'User Profile'}
      </Text>
      <Text className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {user?.email}
      </Text>
      <TextInput
        className="mt-3 rounded-lg border border-gray-200 px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:text-white"
        placeholder="Enter your bio"
        value={bio}
        onChangeText={setBio}
      />
      <Pressable
        className="mt-3 rounded-lg bg-zinc-900 px-4 py-2 dark:bg-white"
        onPress={() => console.log('Bio updated:', bio)}
      >
        <Text className="text-center font-medium text-white dark:text-zinc-900">
          Update Profile
        </Text>
      </Pressable>
    </View>
  );
}
```

### Analytics Integration

Track user events:

```tsx
import { Analytics } from '@repo/analytics/mobile';

// In your component
function FeatureScreen() {
  const handleAction = () => {
    // Track the action
    Analytics.track('feature_used', {
      featureId: 'some-feature-id',
      value: 123
    });
    
    // Perform the action
    // ...
  };
  
  return (
    <Button onPress={handleAction}>
      Use Feature
    </Button>
  );
}
```

## Project Structure

```text
mobile/
├── app/                 # Expo Router screens (file-based routing)
├── components/          # Reusable UI components
├── providers/           # React context providers (Auth, TRPC, PostHog)
├── utils/               # Utility functions (api, trpc client)
├── assets/              # Static assets
├── .env.example         # Example environment variables
├── app.config.ts        # Expo configuration
├── global.css           # NativeWind global CSS
├── tailwind.config.js   # NativeWind / Tailwind v3 config
└── metro.config.js      # Metro bundler with NativeWind
```

## Environment Setup

1. Copy `.env.example` to `.env`
2. Update the environment variables as needed:

```env
EXPO_PUBLIC_TRPC_URL=http://localhost:3001/trpc

EXPO_PUBLIC_POSTHOG_KEY=your_posthog_key_here
EXPO_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

> **Note:** For physical device testing replace `localhost` with your machine's local IP address or use a tunneling tool like ngrok.

## Adding New Features

1. Create screens in `app/` following Expo Router file conventions
2. Add reusable components to `components/`
3. Connect to backend APIs using tRPC procedures from `utils/api.ts`
4. Use NativeWind `className` prop for styling
5. Add analytics tracking for important user actions
