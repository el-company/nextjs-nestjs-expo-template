# Code Review: feature/own-auth — Migracja z Clerk na własny system JWT

> Gałąź: `feature/own-auth` | Diff vs: `main` | Data: 2026-03-18

---

## 🧾 PODSUMOWANIE

Migracja z Clerk na własny system JWT jest generalnie dobrze przemyślana i spójna — bcrypt do hashowania haseł, Passport JWT z osobną strategią dla refresh tokenów, poprawne DTOs z class-validator, tRPC jako warstwa komunikacji. Widać dobre intencje architektoniczne: interfejs `UserRepository` jako port heksagonalny, Redis do cacheowania tokenów, separacja odpowiedzialności między warstwami.

Niemniej jednak implementacja posiada kilka **krytycznych problemów bezpieczeństwa** (plaintext token w bazie danych, token w `localStorage`, JWT secret w `.env` w repozytorium, hardkodowany URL API w kodzie mobilnym), kilka poważnych błędów architektonicznych (mechanizm `setUserRepository` jako Service Locator zamiast DI, duplikacja kodu i typów między platformami, brak rate limitingu), oraz szereg problemów z jakością kodu. Przed wdrożeniem na produkcję wymagane są co najmniej poprawki opisane w sekcji KRYTYCZNE.

---

## 🚨 KRYTYCZNE PROBLEMY

**[CRITICAL-1] Prawdziwy sekret JWT wypchnięty do repozytorium** ⚠️ PARTIAL

Plik `apps/backend/.env` jest commitowany z prawdziwym `JWT_SECRET`:
```
JWT_SECRET=qzE6RERBm8E3u7SP28cRtFwbPOyefGUw1ZCJE9J3fjYjGr8bkRlSTUkdFyfxStWvxAUMrE1fgo8WXGvsvKsG1EO1eB9GKvT02RagXkn5xqWs9szGRwsxvzAzMeAmI
```
Nawet z komentarzem `# <-- CHANGE THIS`, ten konkretny klucz jest teraz w historii git i jest **skompromitowany**. Należy natychmiast rotować ten sekret, dodać `.env` do `.gitignore` i usunąć plik z historii git (`git filter-branch` lub BFG). Wzorcem powinien być wyłącznie plik `.env.local.example` bez żadnych realnych wartości.

---

**[CRITICAL-2] Tokeny dostępu przechowywane w `localStorage` — podatność na XSS** ✅ DONE

`apps/web/src/providers/auth-provider.tsx` linia 83–88:
```typescript
localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
```
`localStorage` jest dostępny dla każdego skryptu działającego na stronie. Jeden XSS = pełne przejęcie sesji. Standardem w Next.js jest przechowywanie access tokenu w pamięci (zmienna stanu React), a refresh tokenu w `httpOnly` cookie (niedostępnym dla JS). Middleware Next.js (`middleware.ts`) prawidłowo może wtedy czytać cookie do weryfikacji.

---

**[CRITICAL-3] Token resetu hasła przechowywany jako plaintext w bazie danych** ✅ DONE

`packages/services/src/auth/auth.service.ts` linia ~345–350:
```typescript
const resetToken = crypto.randomBytes(32).toString("hex");
await repo.update(user.id, {
  passwordResetToken: resetToken,   // ← plaintext!
```
Analogicznie `emailVerificationToken`. Jeśli atakujący uzyska dostęp do bazy danych, może użyć tych tokenów natychmiast do przejęcia kont. Token powinien być hashowany przed zapisem (SHA-256 wystarczy — jest szybki i tokeny są jednorazowe).

---

**[CRITICAL-4] Token resetu hasła logowany w debug logu** ✅ DONE

`packages/services/src/auth/auth.service.ts` linia ~355:
```typescript
this.logger.debug(`Reset token: ${resetToken}`); // Remove in production
```
W środowiskach z centralnym logowaniem (np. Datadog, CloudWatch) ten log może być dostępny dla szerokiego grona osób. Komentarz `// Remove in production` jest niewystarczający — ten kod nie powinien w ogóle trafić do merge'a.

---

**[CRITICAL-5] Brak globalnego `ValidationPipe` — walidacja DTOs nie działa** ✅ DONE

`AuthController` używa `@Body() dto: RegisterDto` z dekoratorami class-validator, ale nigdzie w diff nie widać `ValidationPipe` aplikowanego globalnie w `main.ts`. Bez `app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))` dekoratory `@IsEmail()`, `@MinLength()` itd. **nie wykonują się w ogóle**. Wszystkie DTOs stają się martwym kodem walidacyjnym, a API akceptuje dowolne dane.

---

**[CRITICAL-6] `JwtAuthGuard` nie jest globalny — chronione endpointy mogą być niezabezpieczone** ✅ DONE

`AuthModule` eksportuje `JwtAuthGuard`, ale nie jest on rejestrowany jako `APP_GUARD`. Każdy nowy endpoint musi ręcznie dodawać `@UseGuards(JwtAuthGuard)`. Pominięcie tego dekoratora na jednym kontrolerze = brak autoryzacji. Bezpieczniejszy wzorzec: globalny guard + dekorator `@Public()` dla endpointów publicznych.

---

**[CRITICAL-7] Race condition przy odświeżaniu tokenu na frontendzie** ✅ DONE

W `apps/web/src/providers/auth-provider.tsx` metoda `getToken()` może być wywołana równolegle przez wiele żądań tRPC. Każde z nich sprawdzi ekspirację i wywoła `refreshTokens()` niezależnie. Serwer otrzyma N żądań refresh z tym samym tokenem — pierwsze powiedzie się, kolejne zwrócą 401 (bo token jest już unieważniony po rotacji). Ten sam problem w `apps/mobile/providers/AuthProvider.tsx`. Potrzebny jest mechanizm lock/dedup (`refreshPromise` singleton).

---

## ⚠️ UWAGI / SUGESTIE

**[IMPROVEMENT-1] Antywzorzec Service Locator: `setUserRepository()` zamiast wstrzykiwania zależności** ✅ DONE

`AuthService` posiada `private userRepository: UserRepository | null = null` i metodę `setUserRepository()`. Jest to antipattern — serwis nie jest inicjalizowany poprawnie przez cały czas swojego życia, a `getRepository()` może rzucić wyjątek w runtime zamiast w czasie startu aplikacji. `UsersModule.onModuleInit()` ustawia repozytorium po fakcie, co łamie zasadę inversion of control.

---

**[IMPROVEMENT-2] Duplikacja typów `User`, `TokenPair`, `AuthResponse`, `RegisterData` na 3 platformach** ✅ DONE

Te same interfejsy są zdefiniowane osobno w:
- `packages/services/src/auth/auth.service.ts`
- `apps/web/src/providers/auth-provider.tsx`
- `apps/mobile/providers/AuthProvider.tsx`

Przy każdej zmianie API trzeba aktualizować trzy miejsca i ryzykujesz rozbieżności. Typy powinny być eksportowane z `packages/services` lub dedykowanego `packages/types`.

---

**[IMPROVEMENT-3] Brak rate limitingu na endpointach auth** ✅ DONE

Brak jakiejkolwiek ochrony przed atakami brute-force na `/auth/login` i `/auth/register`. Przy bcrypt 12 rund (~250ms) atakujący może wykonywać ~4 próby/sekundę z jednego IP bez żadnych konsekwencji. NestJS ma `@nestjs/throttler` który można skonfigurować globalnie lub per-endpoint.

---

**[IMPROVEMENT-4] Hardkodowany URL API w komponencie mobilnym** ✅ DONE

`apps/mobile/components/Auth.tsx`:
```typescript
const apiUrl = "http://localhost:3001"; // You should get this from env
```
Komentarz sam diagnozuje problem — ale kod nie jest naprawiony. Na urządzeniu fizycznym lub build produkcyjny ten URL nie zadziała.

---

**[IMPROVEMENT-5] Refresh strategy używa tego samego `JWT_SECRET` co access strategy** ✅ DONE

`JwtRefreshStrategy` używa `JWT_SECRET` identycznie jak `JwtStrategy`. Tokeny są podpisane tym samym sekretem i algorytmem. Dobrą praktyką jest używanie osobnego sekretu `JWT_REFRESH_SECRET` lub dodatkowych claims (`aud: "refresh"`), aby uniemożliwić użycie jednego tokenu zamiast drugiego.

---

**[IMPROVEMENT-6] `findByRefreshToken` zawsze zwróci `null` — martwy kod** ✅ DONE

`UserRepository.findByRefreshToken()` wykonuje `findOne({ where: { refreshToken } })`. Ale w bazie danych zapisywany jest **hash** refresh tokenu. Ta metoda nigdy nie znajdzie użytkownika bo porównuje plaintext z hashem. Jest zdefiniowana w interfejsie, ale nigdy nie jest używana w `AuthService` (który poprawnie używa `findById` + `bcrypt.compare`). Martwy kod wprowadzający w błąd.

---

**[IMPROVEMENT-7] Middleware Next.js czyta token z cookies, ale frontend zapisuje do `localStorage`** ✅ DONE

`apps/web/src/middleware.ts`:
```typescript
const accessToken = request.cookies.get("access_token")?.value || ...
```
Ale `auth-provider.tsx` zapisuje tokeny do `localStorage`, nigdy do cookies. Middleware nigdy nie znajdzie tokenu przy nawigacji przeglądarki — przy każdym odświeżeniu strony chronionej nastąpi przekierowanie do `/sign-in`. Middleware jest praktycznie bezużyteczny w obecnej formie.

---

**[IMPROVEMENT-8] Brak obsługi wygaśnięcia refresh tokenu — brak przekierowania do `/sign-in`** ✅ DONE

Gdy użytkownik wróci po 7 dniach, `initAuth()` → `refreshTokens()` zawiedzie, `setUser(null)` jest wywoływane, ale React nie wie żeby przekierować na `/sign-in`. Użytkownik zobaczy pusty ekran lub błąd.

---

**[IMPROVEMENT-9] Głęboki łańcuch `useCallback` z potencjalnymi nieskończonymi pętlami** ✅ DONE

`useEffect(() => { initAuth() }, [fetchUser])` — `fetchUser` → `useCallback([getToken, clearTokens])` → `useCallback([getStoredTokens, refreshTokens])` → ... Ten łańcuch jest trudny do śledzenia. `initAuth` powinna być uruchamiana tylko raz przy montowaniu — `[]` jako dependency array jest bezpieczniejsze i bardziej czytelne.

---

**[IMPROVEMENT-10] Reset hasła nie wysyła emaila — funkcja nie działa end-to-end** ✅ DONE

`auth.service.ts`:
```typescript
// TODO: Send email with reset link
this.logger.log(`Password reset token generated for: ${user.email}`);
```
Cała flow resetu hasła jest zbudowana (strony web, DTOs, routing), ale faktyczny email nie jest wysyłany. Jest to **bloker funkcjonalny** — użytkownik wejdzie na `/forgot-password`, zobaczy sukces, ale nie dostanie emaila.

---

**[IMPROVEMENT-11] Brak `@Transform()` na polach string w DTOs — whitespace bypass** ✅ DONE

`@IsString()` + `@MinLength(3)` nie chroni przed username składającym się z samych spacji (3 spacje przejdą `MinLength(3)` bez trimowania). Należy dodać `@Transform(({ value }) => value?.trim())`.

---

**[IMPROVEMENT-12] TOCTOU przy rejestracji — brak obsługi błędu unique constraint** ✅ DONE

```typescript
const existingEmail = await repo.findByEmail(dto.email);    // sprawdzenie
// ... (window of opportunity)
const user = await repo.create({...});                        // zapis
```
Dwóch użytkowników może zarejestrować się z tym samym emailem jednocześnie — oboje przejdą walidację, potem jeden dostanie błąd unique constraint z bazy danych. Ten błąd nie jest obsługiwany i wróci jako 500 zamiast 409. Należy opakować `repo.create()` w try/catch.

---

**[IMPROVEMENT-13] Redis cache nie ma mechanizmu natychmiastowego unieważnienia** ⚠️ PARTIAL

`trpc.service.ts` cache'uje dane użytkownika powiązane z tokenem przez 5 minut. Jeśli użytkownik zmieni hasło lub zostanie dezaktywowany, stary token nadal będzie ważny przez do 5 minut. Akceptowalne przy krótkim TTL, ale warto to udokumentować i ewentualnie dodać mechanizm blacklisty tokenów (np. Redis SET).

---

**[IMPROVEMENT-14] Brak indeksów na kolumnach tokenów w migracji** ✅ DONE

Migracja dodaje kolumny `emailVerificationToken`, `passwordResetToken`, ale nie tworzy dla nich indeksów. `findByEmailVerificationToken` i `findByPasswordResetToken` wykonują full table scan.

---

**[IMPROVEMENT-15] `apps/mobile/.env.example` zawiera `JWT_SECRET` jako zmienną mobilną** ✅ DONE

```
JWT_SECRET=your-super-secret-key-minimum-32-characters-long
```
Aplikacja mobilna **nie powinna mieć JWT_SECRET**. Weryfikacja JWT po stronie klienta jest antywzorcem — sekret byłby zakopany w bundle aplikacji, co jest równoznaczne z jego publicznym ujawnieniem. Ta zmienna powinna być usunięta z `.env.example` mobile.

---

## 💡 PROPOZYCJE POPRAWEK

### Poprawka 1: Przechowywanie tokenów — httpOnly cookie zamiast localStorage

```typescript
// BEFORE (auth-provider.tsx)
localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);

// AFTER — access token tylko w stanie React (in-memory)
const [accessToken, setAccessToken] = useState<string | null>(null);
setAccessToken(data.tokens.accessToken);
// Refresh token ustawiany przez backend jako httpOnly cookie
```

```typescript
// AFTER (auth.controller.ts)
async login(
  @Body() dto: LoginDto,
  @Res({ passthrough: true }) res: Response,
): Promise<{ user: UserEntity; accessToken: string }> {
  const data = await this.authService.login(dto);
  res.cookie('refresh_token', data.tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/auth/refresh',
  });
  return { user: data.user, accessToken: data.tokens.accessToken };
}
```

---

### Poprawka 2: Hashowanie tokenów wrażliwych przed zapisem do bazy

```typescript
// BEFORE (auth.service.ts)
const resetToken = crypto.randomBytes(32).toString("hex");
await repo.update(user.id, { passwordResetToken: resetToken });

// AFTER
const resetToken = crypto.randomBytes(32).toString("hex");
const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
await repo.update(user.id, { passwordResetToken: resetTokenHash });
// resetToken (plaintext) wysyłamy emailem, do bazy trafia tylko hash
```

```typescript
// Przy weryfikacji:
async resetPassword(dto: ResetPasswordDto): Promise<void> {
  const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');
  const user = await repo.findByPasswordResetToken(tokenHash);
  // ...
}
```

---

### Poprawka 3: Race condition przy refresh tokenie — singleton promise

```typescript
// BEFORE — każde wywołanie getToken() może wywołać refreshTokens() niezależnie
const getToken = useCallback(async () => {
  if (stored.expiry - Date.now() < 60_000) {
    const newTokens = await refreshTokens(); // wywołane N razy równolegle
    return newTokens?.accessToken || null;
  }
}, [...]);

// AFTER — dedup przez singleton promise
const refreshPromiseRef = useRef<Promise<TokenPair | null> | null>(null);

const refreshTokens = useCallback(async () => {
  if (refreshPromiseRef.current) return refreshPromiseRef.current;
  refreshPromiseRef.current = doActualRefresh().finally(() => {
    refreshPromiseRef.current = null;
  });
  return refreshPromiseRef.current;
}, [...]);
```

---

### Poprawka 4: Dependency Injection zamiast Service Locator

```typescript
// BEFORE (auth.service.ts) — nullable repo + setter
private userRepository: UserRepository | null = null;
setUserRepository(repository: UserRepository): void {
  this.userRepository = repository;
}

// AFTER — wstrzyknięcie przez konstruktor z injection token
// packages/services/src/auth/auth.module.ts
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

// W apps/backend:
@Module({
  providers: [
    { provide: USER_REPOSITORY, useClass: UserRepository },
    AuthService,
  ],
})

// packages/services/src/auth/auth.service.ts
constructor(
  @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
  private readonly jwtService: JwtService,
) {}
```

---

### Poprawka 5: Globalny `ValidationPipe` i `JwtAuthGuard`

```typescript
// apps/backend/src/main.ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,           // usuwa nieznane pola z body
  forbidNonWhitelisted: true,
  transform: true,           // automatycznie castuje typy
}));

// apps/backend/src/app.module.ts — globalny guard
providers: [
  { provide: APP_GUARD, useClass: JwtAuthGuard },
]
// Wtedy @Public() na endpointach auth, reszta domyślnie chroniona
```

---

### Poprawka 6: Usunięcie `.env` z historii git

```bash
# 1. Natychmiast rotować JWT_SECRET w środowisku produkcyjnym
# 2. Usunąć apps/backend/.env z trackowania
echo "apps/backend/.env" >> .gitignore
git rm --cached apps/backend/.env
git commit -m "chore: remove .env from git tracking"
# 3. Oczyścić historię jeśli repo jest/będzie publiczne
# (użyj BFG Repo Cleaner lub git filter-repo)
```

---

## 🧠 DODATKOWE UWAGI

### Architektura — niekonsekwentny Ports & Adapters

Obecna architektura ma potencjał bycia wzorcem heksagonalnym: `IUserRepository` jako port, implementacja w `apps/backend`. Jednak `AuthController` (infrastruktura NestJS) i `AuthService` (domena) siedzą w tym samym pakiecie `packages/services`. Przy dalszym rozwoju warto rozważyć wyciągnięcie czystej logiki domenowej do `packages/core` bez żadnych zależności NestJS.

### Skalowalność — jeden refresh token na użytkownika

Kolumna `refreshToken` w tabeli `users` przechowuje jeden token. Zalogowanie z drugiego urządzenia unieważnia sesję na pierwszym. Dla aplikacji multi-device (web + mobile) należy rozważyć osobną tabelę:
```sql
refresh_tokens(id, user_id, token_hash, device_id, expires_at, created_at)
```

### Brak testów

W diff nie widać żadnych plików `*.spec.ts`. System auth zawiera krytyczną logikę biznesową (porównanie haseł, generowanie tokenów, weryfikacja expiry) bez coverage testami. Minimum: testy jednostkowe dla `AuthService` z mockiem `IUserRepository` + test integracyjny dla flow login → refresh → logout.

### `expiresIn` niekonwencjonalne — milisekundy zamiast Unix timestamp

`parseExpiry` zwraca milisekundy zapisywane jako `Date.now() + tokens.expiresIn`. Standardem JWT jest `exp` jako Unix timestamp w sekundach. Pole warto przemianować na `expiresAt: number` (timestamp) dla jednoznaczności.


## ✅ IMPLEMENTATION STATUS

- CRITICAL-1: ⚠️ PARTIAL — usunięto `apps/backend/.env` i dodano `.env.example`, ale historia gita wymaga osobnego czyszczenia (BFG/git filter-repo).
- CRITICAL-2: ✅ DONE — web używa pamięci + httpOnly cookie (refresh).
- CRITICAL-3: ✅ DONE — tokeny resetu i weryfikacji są hashowane (SHA-256).
- CRITICAL-4: ✅ DONE — usunięto logowanie tokenu resetu.
- CRITICAL-5: ✅ DONE — globalny `ValidationPipe` z `forbidNonWhitelisted: true`.
- CRITICAL-6: ✅ DONE — globalny `JwtAuthGuard` + `@Public()` na publicznych endpointach.
- CRITICAL-7: ✅ DONE — deduplikacja refresh w web/mobile (`refreshPromiseRef`).
- IMPROVEMENT-1: ✅ DONE — DI przez token `USER_REPOSITORY`, bez Service Locator.
- IMPROVEMENT-2: ✅ DONE — współdzielone typy w `@repo/services`.
- IMPROVEMENT-3: ✅ DONE — rate limiting na login/register (Throttler).
- IMPROVEMENT-4: ✅ DONE — mobilny URL z env (`getApiUrl`).
- IMPROVEMENT-5: ✅ DONE — osobny `JWT_REFRESH_SECRET` + `aud` dla refresh.
- IMPROVEMENT-6: ✅ DONE — usunięto martwe `findByRefreshToken`.
- IMPROVEMENT-7: ✅ DONE — middleware i klient spójne z cookie.
- IMPROVEMENT-8: ✅ DONE — redirect do `/sign-in` po nieudanym refresh (web).
- IMPROVEMENT-9: ✅ DONE — `useEffect` inicjalizacji z `[]`.
- IMPROVEMENT-10: ✅ DONE — wysyłka emaila resetu (SMTP) z fallbackiem log.
- IMPROVEMENT-11: ✅ DONE — trimowanie stringów w DTO.
- IMPROVEMENT-12: ✅ DONE — obsługa unique constraint (409).
- IMPROVEMENT-13: ⚠️ PARTIAL — TTL cache ograniczony do `exp`, brak blacklisty natychmiastowej.
- IMPROVEMENT-14: ✅ DONE — indeksy na tokenach w migracji.
- IMPROVEMENT-15: ✅ DONE — usunięto `JWT_SECRET` z mobile env.
