import { t } from "@repo/trpc";
import type { AppRouter, TRPCContext, TRPCService } from "@repo/trpc";

/**
 * Create a type-safe tRPC caller that invokes procedures directly
 * (no HTTP round-trip), useful for asserting business logic.
 *
 * @param trpcService  The TRPCService instance from the NestJS module
 * @param ctx          Optional partial context override (e.g. authenticated user)
 */
export function createTestCaller(
  trpcService: TRPCService,
  ctx: Partial<TRPCContext> = {}
) {
  const router = trpcService.router as AppRouter;
  const callerFactory = t.createCallerFactory(router);

  const defaultCtx: TRPCContext = {
    req: {} as never,
    res: {} as never,
    auth: { userId: null, isAuthenticated: false, user: null },
    ...ctx,
  };

  return callerFactory(defaultCtx);
}

/**
 * Build an authenticated context for the caller.
 */
export function authenticatedCtx(
  userId: string,
  email: string,
  username: string
): Partial<TRPCContext> {
  return {
    auth: {
      userId,
      isAuthenticated: true,
      user: {
        id: userId,
        email,
        username,
        firstName: null,
        lastName: null,
        imageUrl: null,
        roles: ["user"],
      },
    },
  };
}
