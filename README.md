# Next.js + NestJS + Expo Monorepo Template

<div align="center">

<a href="https://nestjs.com"><img src="https://img.shields.io/badge/nestjs-%23E0234E.svg?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" /></a>
<a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" /></a>
<a href="https://expo.dev"><img src="https://img.shields.io/badge/expo-1C1E24?style=for-the-badge&logo=expo&logoColor=#D04A37" alt="Expo" /></a>
<a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></a>
<a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="TailwindCSS" /></a>
<a href="https://socket.io"><img src="https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101" alt="Socket.io" /></a>
<a href="https://typeorm.io"><img src="https://img.shields.io/badge/TypeORM-E83524?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xNiA4SDhjLS4yNjYgMC0uNTIuMTA1LS43MDcuMjkzQTEgMSAwIDAgMCA3IDl2MTRhMSAxIDAgMCAwIDEgMWg4YTEgMSAwIDAgMCAxLTFWOWExIDEgMCAwIDAtMS0xem0tMSAydjEySDl2LTEyem05LTJoLThhMSAxIDAgMCAwLTEgMXYxNGExIDEgMCAwIDAgMSAxaDhhMSAxIDAgMCAwIDEtMVY5YTEgMSAwIDAgMC0xLTF6bS0xIDJ2MTJoLTZ2LTEyeiIvPjwvc3ZnPg==" alt="TypeORM" /></a>
<a href="https://trpc.io"><img src="https://img.shields.io/badge/tRPC-%232596BE.svg?style=for-the-badge&logo=trpc&logoColor=white" alt="tRPC" /></a>
<a href="https://gluestack.io"><img src="https://img.shields.io/badge/GlueStack_UI-000000?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI0IiBmaWxsPSIjMDlCNkZGIi8+PC9zdmc+" alt="GlueStack UI" /></a>
<a href="https://tanstack.com/query"><img src="https://img.shields.io/badge/TanStack%20Query-FF4154?style=for-the-badge&logo=react-query&logoColor=white" alt="TanStack Query" /></a>
<a href="https://posthog.com"><img src="https://img.shields.io/badge/PostHog-000000?style=for-the-badge&logo=posthog&logoColor=white" alt="PostHog" /></a>
<a href="https://www.postgresql.org"><img src="https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" /></a>
<a href="https://turbo.build"><img src="https://img.shields.io/badge/Turborepo-000000?style=for-the-badge&logo=turborepo&logoColor=white" alt="Turborepo" /></a>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Stargazers](https://img.shields.io/github/stars/barisgit/nextjs-nestjs-expo-template.svg?style=flat-square)](https://github.com/barisgit/nextjs-nestjs-expo-template/stargazers)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://makeapullrequest.com)

A modern full-stack, type-safe monorepo template with real-time capabilities and cross-platform support.

[Demo](https://demo-link.com) · [Report Bug](https://github.com/barisgit/nextjs-nestjs-expo-template/issues) · [Request Feature](https://github.com/barisgit/nextjs-nestjs-expo-template/issues)

</div>

<!-- <p align="center">
  <img src="https://via.placeholder.com/800x400?text=Next.js+NestJS+Expo+Template" alt="Project Banner" width="800"/>
</p> -->

## ✨ Features

- **📦 Monorepo Setup**: Turborepo with pnpm for efficient workspace management
- **🔄 Full Type Safety**: End-to-end type safety from backend to frontend with tRPC and typed WebSockets
- **🚀 Modern Stack**: Next.js, NestJS, and Expo with TypeScript
- **🔌 Real-time Communication**: Type-safe WebSockets integration with Socket.IO
- **👤 Authentication**: Custom JWT auth with email verification, password reset, and role-based access control
- **📊 Analytics**: PostHog integration for tracking user behavior
- **🎨 UI Components**: TailwindCSS with ShadCN UI for web and NativeWind + GlueStack UI for mobile
- **🧩 Modular Architecture**: Well-organized packages for code sharing

## 🚀 Quick Start

### Prerequisites

- Node.js (v18+)
- PostgreSQL
- pnpm (`npm install -g pnpm`)

### One-click Setup

```bash
# Clone the repository
git clone https://github.com/barisgit/nextjs-nestjs-expo-template.git
cd nextjs-nestjs-expo-template

# Install dependencies
pnpm i # or pnpm install

# Run the development setup script 
# This command handles:
#  - Copying .env files
#  - Setting up database (Docker or manual)
#  - Setting up Redis (Docker)
#  - Running database migrations
#  - Seeding the database
pnpm dev:setup

# NOTE: Ensure Docker is running if you rely on the default Docker setup for PostgreSQL and Redis.
# The script will prompt you for necessary details or use .env files if they exist.

# Start all development servers (Backend, Web, Mobile)
pnpm dev

# Or run individual servers:
# pnpm dev:backend # NestJS
# pnpm dev:web     # Next.js
# pnpm dev:mobile  # Expo
```

## 📂 Project Structure

```text
nextjs-nestjs-expo-template/
├── apps/
│   ├── backend/     # NestJS API server
│   ├── web/         # Next.js web application
│   └── mobile/      # Expo React Native application
├── packages/
│   ├── analytics/   # PostHog analytics integration
│   ├── db/          # Database models and TypeORM configuration
│   ├── services/    # Shared services (auth, redis, webhooks)
│   ├── trpc/        # tRPC API router definitions and context
│   ├── ui/          # Shared UI components (ShadCN UI for web)
│   ├── websockets/  # Type-safe WebSocket implementation
│   ├── eslint-config/ # Shared ESLint configuration
│   └── typescript-config/ # Shared TypeScript configuration
```

## 🖥️ Tech Stack

<p align="center">
  <a href="https://nestjs.com/"><img src="https://docs.nestjs.com/assets/logo-small.svg" alt="NestJS" width="50" /></a>&nbsp;&nbsp;
  <a href="https://nextjs.org/"><img src="https://cdn.worldvectorlogo.com/logos/next-js.svg" alt="Next.js" width="50" /></a>&nbsp;&nbsp;
  <a href="https://expo.dev/"><img src="https://www.vectorlogo.zone/logos/expoio/expoio-icon.svg" alt="Expo" width="50" /></a>&nbsp;&nbsp;
  <a href="https://trpc.io/"><img src="https://avatars.githubusercontent.com/u/78011399?s=200&v=4" alt="tRPC" width="50" /></a>&nbsp;&nbsp;
  <a href="https://www.typescriptlang.org/"><img src="https://cdn.worldvectorlogo.com/logos/typescript.svg" alt="TypeScript" width="50" /></a>&nbsp;&nbsp;
  <a href="https://tailwindcss.com/"><img src="https://cdn.worldvectorlogo.com/logos/tailwindcss.svg" alt="TailwindCSS" width="50" /></a>&nbsp;&nbsp;
  <a href="https://socket.io/"><img src="https://cdn.worldvectorlogo.com/logos/socket-io.svg" alt="Socket.io" width="50" /></a>&nbsp;&nbsp;
  <a href="https://typeorm.io/"><img src="https://raw.githubusercontent.com/typeorm/typeorm/master/resources/logo_big.png" alt="TypeORM" height="50" /></a>&nbsp;&nbsp;
  <a href="https://gluestack.io/"><img src="https://avatars.githubusercontent.com/u/111681240?s=200&v=4" alt="GlueStack UI" height="50" /></a>&nbsp;&nbsp;
  <a href="https://ui.shadcn.com/"><img src="https://avatars.githubusercontent.com/u/139895814?s=200&v=4" alt="shadcn/ui" height="50" /></a>&nbsp;&nbsp;
  <a href="https://tanstack.com/query"><img src="https://tanstack.com/_build/assets/logo-color-100w-br5_Ikqp.png" alt="TanStack Query" height="50" /></a>&nbsp;&nbsp;
  <a href="https://posthog.com/"><img src="https://posthog.com/brand/posthog-logo.svg" alt="PostHog" height="50" /></a>&nbsp;&nbsp;
  <a href="https://turbo.build/"><img src="https://turbo.build/images/docs/repo/repo-hero-logo-dark.svg" alt="Turborepo" height="50" /></a>
</p>

### Backend

- **NestJS**: A progressive Node.js framework for scalable server-side applications
- **TypeORM**: ORM for TypeScript and JavaScript with PostgreSQL
- **Socket.IO**: Real-time bidirectional event-based communication with type safety
- **PostgreSQL**: Open-source relational database

### Frontend

- **Next.js**: React framework for production-grade applications
- **TailwindCSS**: Utility-first CSS framework
- **ShadCN UI**: Beautifully designed components built with Radix UI and Tailwind CSS
- **TanStack Query**: Data fetching and caching library

### Mobile

- **Expo**: Platform for making universal React applications
- **React Native**: Framework for building native apps using React
- **NativeWind v4**: Tailwind CSS for React Native
- **GlueStack UI v2**: Accessible component primitives with NativeWind integration

### Common

- **TypeScript**: Typed superset of JavaScript
- **tRPC**: End-to-end typesafe APIs
- **Turborepo**: High-performance build system for JavaScript/TypeScript monorepos
- **PostHog**: Open-source product analytics platform

## 📖 Documentation

Each package and application contains its own detailed documentation:

- [Backend Documentation](apps/backend/README.md)
- [Web Documentation](apps/web/README.md)
- [Mobile Documentation](apps/mobile/README.md)
- [Analytics Package](packages/analytics/README.md)
- [Database Package](packages/db/README.md)
- [Services Package](packages/services/README.md)
- [tRPC Package](packages/trpc/README.md)
- [UI Package](packages/ui/README.md)
- [WebSockets Package](packages/websockets/README.md)

## 💡 Usage Examples

### Type-safe API with tRPC

```tsx
// Client component
function UserProfile() {
  const { data, isLoading } = trpc.users.getProfile.useQuery();
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>Welcome, {data.name}!</h1>
    </div>
  );
}
```

### Type-safe Real-time Communication

```tsx
// WebSocket setup with type safety
import { createTypedSocketClient, ClientEvents, ServerEvents } from '@repo/websockets';

const socket = createTypedSocketClient('http://your-api-url');
socket.emit(ClientEvents.JOIN_ROOM, roomId);

// Listen for messages with full type safety
socket.on(ServerEvents.MESSAGE, (message) => {
  console.log('New message:', message);
});
```

## 🛠️ Development Scripts

This project includes several helpful scripts for development and maintenance, located in the `scripts/` directory.

### Environment Variable Inspection

```bash
pnpm inspect:envs
```

This command scans the `apps/` and `packages/` directories for all `.env*` files (e.g., `.env`, `.env.local`, `.env.example`). It then prints the key-value pairs found in each file, grouped by project (app or package).

This is useful for:
- Verifying that all necessary environment variables are present in example files.
- Quickly checking the configured values across different environments.
- Debugging environment-related issues.

The script is powered by the `EnvManager` utility (`scripts/utilities/env-manager.ts`), which is designed to parse `.env` files while preserving comments and whitespace, making it useful for both reading and programmatically modifying environment configurations.

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/amazing-feature`)
3. Commit your Changes (`git commit -m 'Add some amazing feature'`)
4. Push to the Branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📧 Contact

Blaž Aristovnik - [@barisgit](https://github.com/barisgit) - [aristovnik.me](https://aristovnik.me)

## 🙏 Acknowledgments

- [Turborepo](https://turbo.build/)
- [NestJS](https://nestjs.com/)
- [Next.js](https://nextjs.org/)
- [Expo](https://expo.dev/)
- [tRPC](https://trpc.io/)
- [TypeORM](https://typeorm.io/)
- [Socket.IO](https://socket.io/)
- [ShadCN UI](https://ui.shadcn.com/)
- [GlueStack UI](https://gluestack.io/)
- [NativeWind](https://www.nativewind.dev/)
- [PostHog](https://posthog.com/)
