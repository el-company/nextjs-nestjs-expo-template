# Feature Implementation: Email Verification & Password Reset (Code-Based)

## 🧾 Summary

Implemented a complete, production-ready email verification and password reset system using 6-digit OTP codes instead of token-based URL links. The email sending infrastructure was refactored into a swappable provider pattern, with **Resend** as the primary provider and SMTP as a fallback. MJML is used for responsive, styled email templates.

---

## 📦 Provider Choice: Resend

**Resend** was selected for email delivery because:
- **Free tier**: 3,000 emails/month, 100/day — no credit card required
- Simple REST API with an official Node.js SDK (`resend`)
- First-class TypeScript support
- Easy to swap later (abstracted behind `IEmailProvider`)

### Required environment variables

Add to `apps/backend/.env`:

```env
# Email provider (resend | smtp)
EMAIL_PROVIDER=resend

# Resend (get API key from resend.com)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
RESEND_FROM=noreply@yourdomain.com

# Optional: SMTP fallback (set EMAIL_PROVIDER=smtp to use)
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USER=user@example.com
# SMTP_PASSWORD=secret
# SMTP_FROM=noreply@yourdomain.com
```

> **Setup steps for Resend:**
> 1. Create an account at [resend.com](https://resend.com)
> 2. Add and verify your sending domain (or use their `@resend.dev` test address during dev)
> 3. Generate an API key → paste as `RESEND_API_KEY`
> 4. Set `RESEND_FROM` to a verified sender address

---

## 🧱 Scope of Implementation

### Backend (NestJS)

**New module: `apps/backend/src/verification-code/`**
- `VerificationCodeService` — generates 6-digit codes, validates them, enforces rate-limiting (max 3 codes/hour) and attempt limits (max 3 wrong attempts)
- `VerificationCodeModule` — global, exports `VERIFICATION_CODE_SERVICE` token

**Refactored: `apps/backend/src/email/`**
- `IEmailProvider` interface — low-level "send an email" abstraction
- `ResendEmailProvider` — Resend SDK implementation
- `SmtpEmailProvider` — Nodemailer SMTP implementation (kept as fallback)
- `EmailModule` — selects provider based on `EMAIL_PROVIDER` env var
- `AppEmailService` — high-level service implementing `EmailService` interface; composes provider + MJML templates
- MJML templates: `email-verification.template.ts`, `password-reset.template.ts`

**Updated: `packages/services/src/auth/`**
- `AuthService` — updated to use code-based flows for email verification and password reset; new `resendVerification()` method
- `AuthController` — new endpoint `POST /auth/resend-verification`; `verify-email` is now JWT-protected
- `VerifyEmailDto` — changed field from `token` to `code` (6-digit numeric)
- `ResetPasswordDto` — changed from `token` to `email + code`
- `types.ts` — updated `EmailService` interface; added `IVerificationCodeService` interface
- `tokens.ts` — added `VERIFICATION_CODE_SERVICE` symbol

### Database / Migrations

**New entity: `packages/db/src/entities/verification-code.entity.ts`**

```
verification_codes table:
  id          UUID PK
  user_id     UUID FK → users.id (CASCADE DELETE)
  code        VARCHAR(6)
  purpose     ENUM('email_verification', 'password_reset')
  expires_at  TIMESTAMP
  is_used     BOOLEAN DEFAULT false
  attempts    INT DEFAULT 0
  created_at  TIMESTAMP DEFAULT NOW()

Indexes:
  (user_id, purpose, is_used) — fast lookup
  (expires_at) — for cleanup queries
```

**New migration: `packages/db/src/migrations/1745700000000-AddVerificationCodes.ts`**

Run with: `pnpm --filter @repo/db migration:run`

### API Changes

| Method | Path | Auth | Change |
|--------|------|------|--------|
| POST | `/auth/verify-email` | JWT required | Body changed: `token` → `code` |
| POST | `/auth/resend-verification` | JWT required | **NEW** endpoint |
| POST | `/auth/forgot-password` | Public | Now sends 6-digit code, same body |
| POST | `/auth/reset-password` | Public | Body changed: `token` → `email + code` |

### Frontend Web (Next.js)

- `sign-up/page.tsx` — redirects to `/verify-email` after registration (was `/`)
- `verify-email/page.tsx` — completely rewritten: 6-digit OTP input with paste support, auto-focus, resend button
- `forgot-password/page.tsx` — success state now links to `/reset-password?email=...` instead of generic message
- `reset-password/page.tsx` — completely rewritten: code input + new password form (no longer token-from-URL)

### Mobile (Expo)

- `Auth.tsx` — extended with two new modes:
  - `"verify"` — shown after registration; 6-digit code input with resend
  - `"reset-code"` — shown after forgot-password; code + new password inputs

---

## 📁 Modified Files

### Created
- `packages/db/src/entities/verification-code.entity.ts`
- `packages/db/src/migrations/1745700000000-AddVerificationCodes.ts`
- `apps/backend/src/verification-code/verification-code.service.ts`
- `apps/backend/src/verification-code/verification-code.module.ts`
- `apps/backend/src/email/providers/email-provider.interface.ts`
- `apps/backend/src/email/providers/resend.provider.ts`
- `apps/backend/src/email/providers/smtp.provider.ts`
- `apps/backend/src/email/templates/email-verification.template.ts`
- `apps/backend/src/email/templates/password-reset.template.ts`

### Modified
- `packages/db/src/entities/index.ts` — export VerificationCode
- `packages/db/src/data-source.ts` — add VerificationCode to entities
- `packages/services/src/auth/types.ts` — updated EmailService + added IVerificationCodeService
- `packages/services/src/auth/tokens.ts` — added VERIFICATION_CODE_SERVICE
- `packages/services/src/auth/dto/verify-email.dto.ts` — token → code
- `packages/services/src/auth/dto/reset-password.dto.ts` — token → email+code
- `packages/services/src/auth/auth.service.ts` — code-based flows
- `packages/services/src/auth/auth.controller.ts` — new endpoint, updated guards
- `apps/backend/src/email/email.service.ts` — rewritten
- `apps/backend/src/email/email.module.ts` — provider pattern
- `apps/backend/src/app.module.ts` — added VerificationCodeModule
- `apps/backend/src/users/user.repository.ts` — optional emailVerificationToken
- `apps/web/src/app/(auth)/sign-up/page.tsx` — redirect to verify-email
- `apps/web/src/app/(auth)/verify-email/page.tsx` — OTP code input
- `apps/web/src/app/(auth)/forgot-password/page.tsx` — updated success flow
- `apps/web/src/app/(auth)/reset-password/page.tsx` — code-based reset
- `apps/mobile/components/Auth.tsx` — verify + reset-code modes

---

## 🔧 Key Decisions

1. **Code-based OTP over token-URL links** — Better mobile UX; no deep-link handling needed; consistent flow on web and mobile

2. **`verify-email` is now a protected JWT endpoint** — User is always logged in after registration, so this is safe and simpler (no need to pass user identity separately)

3. **`reset-password` identifies user by email** — Since user is not authenticated during reset, email is passed alongside the code

4. **Email provider abstraction** — `IEmailProvider` interface makes it trivial to swap Resend for SendGrid, Postmark, etc. with zero changes to business logic

5. **MJML rendered at call-time, not startup** — Templates are TypeScript functions compiled on first call; no file I/O, no caching complexity

6. **Rate limiting on code generation** — Max 3 codes per hour per user per purpose; max 3 wrong attempts before code is locked

7. **Codes expire in 10 minutes** — Short enough to be secure, long enough to be practical

---

## 💡 Edge Cases & Assumptions

- If `RESEND_API_KEY` or `RESEND_FROM` is not set, emails are logged to console (safe dev fallback)
- Registration never fails even if email sending fails (code error is caught + logged)
- `forgotPassword` never reveals whether an account exists (same response either way)
- Re-sending a verification code invalidates all previous active codes for that user+purpose
- `emailVerificationToken` / `emailVerificationExpires` columns still exist in `users` table but are no longer used (backward compat)

---

## 🧪 Testability

- `VerificationCodeService` can be unit-tested with an in-memory TypeORM repository
- `IEmailProvider` can be mocked in tests (just replace the `EMAIL_PROVIDER` token)
- All DTOs have class-validator decorators for integration test coverage
- Rate limiting constants (`MAX_ATTEMPTS`, `MAX_CODES_PER_HOUR`) are module-level constants — easy to override in tests
