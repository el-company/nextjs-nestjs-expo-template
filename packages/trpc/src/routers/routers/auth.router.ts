import { Injectable, Logger, ConflictException, UnauthorizedException, NotFoundException, BadRequestException } from "@nestjs/common";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { AuthService } from "@repo/services";
import { procedure, protectedProcedure, t } from "../base/index.js";

function mapNestExceptionToTRPC(error: unknown, fallback: string): TRPCError {
  if (error instanceof ConflictException)
    return new TRPCError({ code: "CONFLICT", message: error.message });
  if (error instanceof UnauthorizedException)
    return new TRPCError({ code: "UNAUTHORIZED", message: error.message });
  if (error instanceof NotFoundException)
    return new TRPCError({ code: "NOT_FOUND", message: error.message });
  if (error instanceof BadRequestException)
    return new TRPCError({ code: "BAD_REQUEST", message: error.message });
  return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: fallback });
}

// Validation schemas
const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s])[^\s]{8,}$/,
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
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z
    .string()
    .min(8)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s])[^\s]{8,}$/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
});

const verifyEmailSchema = z.object({
  code: z.string().length(6),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s])[^\s]{8,}$/,
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
        throw mapNestExceptionToTRPC(error, "Registration failed");
      }
    }),

    // Login
    login: procedure.input(loginSchema).mutation(async ({ input }) => {
      try {
        const result = await this.authService.login(input);
        return result;
      } catch (error: unknown) {
        throw mapNestExceptionToTRPC(error, "Login failed");
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
          throw mapNestExceptionToTRPC(error, "Token refresh failed");
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
          throw mapNestExceptionToTRPC(error, "Password reset failed");
        }
      }),

    // Verify email
    verifyEmail: protectedProcedure.input(verifyEmailSchema).mutation(async ({ ctx, input }) => {
      try {
        await this.authService.verifyEmail(ctx.auth.userId!, input);
        return { message: "Email verified successfully" };
      } catch (error: unknown) {
        throw mapNestExceptionToTRPC(error, "Email verification failed");
      }
    }),

    // Get user profile (protected)
    getMe: protectedProcedure.query(async ({ ctx }) => {
      try {
        const profile = await this.authService.getMe(ctx.auth.userId!);
        return profile;
      } catch (error: unknown) {
        throw mapNestExceptionToTRPC(error, "Failed to get profile");
      }
    }),

    // Change password (protected)
    changePassword: protectedProcedure
      .input(changePasswordSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          await this.authService.changePassword(ctx.auth.userId!, input);
          return { message: "Password changed successfully" };
        } catch (error: unknown) {
          throw mapNestExceptionToTRPC(error, "Password change failed");
        }
      }),

    // Logout (protected)
    logout: protectedProcedure.mutation(async ({ ctx }) => {
      await this.authService.logout(ctx.auth.userId!);
      return { message: "Successfully logged out" };
    }),
  });
}
