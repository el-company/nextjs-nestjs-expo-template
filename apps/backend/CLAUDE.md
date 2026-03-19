# CLAUDE.md — Backend (NestJS)

## Stack
- NestJS z TypeScript (ESM — importy z `.js`)
- TypeORM + PostgreSQL
- JWT + Refresh Token auth
- Redis (caching, session store)
- Socket.IO (WebSockets)
- tRPC (główny protokół API)
- PostHog (analytics)
- Resend / SMTP (email)

## Komendy

```bash
pnpm dev:backend          # uruchamia w trybie watch
pnpm --filter @repo/backend build
pnpm --filter @repo/backend test
pnpm --filter @repo/backend test:cov
```

## Struktura `src/`

```
src/
  app.module.ts          # root moduł — rejestruje wszystkie moduły
  main.ts                # bootstrap, CORS, cookies, port
  auth/                  # kontroler auth (REST fallback), testy guardów
  config/
    app-config.module.ts # ConfigModule + walidacja przez Joi
    validation.schema.ts # WSZYSTKIE zmienne env — dodaj tu każdą nową
  email/                 # EmailModule: resend lub SMTP (przez EMAIL_PROVIDER)
  health/                # /health endpoint (liveness check)
  redis/                 # RedisModule (z @repo/services)
  users/                 # UsersModule: CRUD użytkowników
  verification-code/     # kody weryfikacyjne email + reset hasła
  scripts/               # skrypty pomocnicze (np. seed)
  data-source.ts         # TypeORM DataSource (do migracji CLI)
```

## Dodawanie nowych funkcji

### Nowy moduł NestJS
1. Utwórz folder `src/nazwa/`
2. Utwórz `nazwa.module.ts`, `nazwa.service.ts`, `nazwa.controller.ts` (jeśli REST)
3. Zarejestruj moduł w `src/app.module.ts`

### Nowy endpoint tRPC
1. Utwórz lub edytuj router w `packages/trpc/src/routers/`
2. Zarejestruj w `packages/trpc/src/routers/index.ts`
3. Wstrzyknij potrzebne serwisy przez NestJS DI

### Nowa zmienna środowiskowa
1. Dodaj do `src/config/validation.schema.ts` (Joi)
2. Dodaj do `apps/backend/.env.example` z opisem
3. Użyj przez `ConfigService` (`this.configService.get<string>('NAZWA')`)

## Auth — jak działa

- `JwtAuthGuard` jest **globalny** (zarejestrowany jako `APP_GUARD` w `app.module.ts`)
- Domyślnie wszystkie endpointy wymagają auth
- Aby odblokować: `@Public()` dekorator (z `@repo/services`)
- Refresh token flow: POST `/trpc/auth.refreshToken`
- Weryfikacja email: 6-cyfrowy kod przez `VerificationCodeModule`

## Email

Provider wybierany przez `EMAIL_PROVIDER` env:
- `resend` — wymaga `RESEND_API_KEY` + `RESEND_FROM`
- `smtp` — wymaga `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`

W dev ustaw `DEV_EMAIL_REDIRECT` aby przekierować wszystkie maile na jeden adres.

## Baza danych

- Encje: `packages/db/src/entities/`
- Migracje: `packages/db/src/migrations/`
- DataSource config: `src/data-source.ts` (używany przez TypeORM CLI)
- Przy zmianie encji ZAWSZE generuj migrację — nie modyfikuj istniejących

## Ważne wzorce

```typescript
// Publiczny endpoint (bez auth)
@Public()
@Mutation()
async register(@Input() dto: RegisterDto) { ... }

// Chroniony endpoint z rolą
@Roles('admin')
@UseGuards(RolesGuard)
async adminAction() { ... }

// Wstrzykiwanie ConfigService
constructor(private readonly configService: ConfigService) {}
const secret = this.configService.get<string>('JWT_SECRET');
```
