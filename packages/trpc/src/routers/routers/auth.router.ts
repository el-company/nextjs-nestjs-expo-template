import { Injectable, Logger } from "@nestjs/common";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { AuthService } from "@repo/services";
import { procedure, protectedProcedure, t } from "../base/index.js";

// Validation schemas
const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z
    .string()
    .min(8)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
});

const verifyEmailSchema = z.object({
  token: z.string(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
});

@Injectable()
export class AuthRouter {
  private readonly logger = new Logger(AuthRouter.name);

  constructor(private readonly authService: AuthService) {}

  public readonly router = t.router({
    // Get current user (public endpoint but returns auth state)
    getUser: procedure.query(({ ctx }) => {
      return {
        user: ctx.auth.user,
        isAuthenticated: ctx.auth.isAuthenticated,
      };
    }),

    // Register a new user
    register: procedure.input(registerSchema).mutation(async ({ input }) => {
      try {
        const result = await this.authService.register(input);
        return result;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Registration failed";
        if (message.includes("already")) {
          throw new TRPCError({
            code: "CONFLICT",
            message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message,
        });
      }
    }),

    // Login
    login: procedure.input(loginSchema).mutation(async ({ input }) => {
      try {
        const result = await this.authService.login(input);
        return result;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Login failed";
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message,
        });
      }
    }),

    // Refresh tokens
    refreshToken: procedure
      .input(refreshTokenSchema)
      .mutation(async ({ input }) => {
        try {
          const tokens = await this.authService.refreshTokens(input.refreshToken);
          return tokens;
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Token refresh failed";
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message,
          });
        }
      }),

    // Forgot password
    forgotPassword: procedure
      .input(forgotPasswordSchema)
      .mutation(async ({ input }) => {
        await this.authService.forgotPassword(input);
        return {
          message:
            "If an account exists with this email, a password reset link has been sent",
        };
      }),

    // Reset password
    resetPassword: procedure
      .input(resetPasswordSchema)
      .mutation(async ({ input }) => {
        try {
          await this.authService.resetPassword(input);
          return { message: "Password reset successfully" };
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Password reset failed";
          throw new TRPCError({
            code: "BAD_REQUEST",
            message,
          });
        }
      }),

    // Verify email
    verifyEmail: procedure.input(verifyEmailSchema).mutation(async ({ input }) => {
      try {
        await this.authService.verifyEmail(input);
        return { message: "Email verified successfully" };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Email verification failed";
        throw new TRPCError({
          code: "BAD_REQUEST",
          message,
        });
      }
    }),

    // Get user profile (protected)
    getMe: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.auth.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User ID is missing",
        });
      }

      try {
        const profile = await this.authService.getMe(ctx.auth.userId);
        return profile;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to get profile";
        throw new TRPCError({
          code: "NOT_FOUND",
          message,
        });
      }
    }),

    // Change password (protected)
    changePassword: protectedProcedure
      .input(changePasswordSchema)
      .mutation(async ({ ctx, input }) => {
        if (!ctx.auth.userId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User ID is missing",
          });
        }

        try {
          await this.authService.changePassword(ctx.auth.userId, input);
          return { message: "Password changed successfully" };
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Password change failed";
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message,
          });
        }
      }),

    // Logout (protected)
    logout: protectedProcedure.mutation(async ({ ctx }) => {
      if (!ctx.auth.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User ID is missing",
        });
      }

      await this.authService.logout(ctx.auth.userId);
      return { message: "Successfully logged out" };
    }),
  });
}
