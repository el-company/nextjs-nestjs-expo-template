import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Res,
} from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service.js";
import type { AuthResponse, TokenPair, UserProfile } from "./types.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";
import { GetUser } from "./decorators/get-user.decorator.js";
import { Public } from "./decorators/public.decorator.js";
import type { JwtPayload } from "./types.js";
import type { Request, Response } from "express";
import { ConfigService } from "@nestjs/config";
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  ChangePasswordDto,
} from "./dto/index.js";
import { parseExpiryToMs } from "./utils.js";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {}

  @Post("register")
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Register a new user" })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: "User successfully registered" })
  @ApiResponse({ status: 409, description: "Email or username already exists" })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response
  ): Promise<AuthResponse> {
    const result = await this.authService.register(dto);
    this.setRefreshCookie(res, result.tokens.refreshToken);
    return result;
  }

  @Post("login")
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login with email and password" })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: "Successfully logged in" })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response
  ): Promise<AuthResponse> {
    const result = await this.authService.login(dto);
    this.setRefreshCookie(res, result.tokens.refreshToken);
    return result;
  }

  @Post("refresh")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Refresh access token" })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: "Tokens refreshed successfully" })
  @ApiResponse({ status: 401, description: "Invalid refresh token" })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<TokenPair> {
    const refreshToken = dto.refreshToken || req.cookies?.refresh_token || "";
    const tokens = await this.authService.refreshTokens(refreshToken);
    this.setRefreshCookie(res, tokens.refreshToken);
    return tokens;
  }

  @Post("verify-email")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Verify email address with 6-digit code" })
  @ApiBody({ type: VerifyEmailDto })
  @ApiResponse({ status: 200, description: "Email verified successfully" })
  @ApiResponse({ status: 400, description: "Invalid or expired code" })
  @ApiResponse({ status: 401, description: "Not authenticated" })
  async verifyEmail(
    @GetUser() user: JwtPayload,
    @Body() dto: VerifyEmailDto
  ): Promise<{ message: string }> {
    await this.authService.verifyEmail(user.sub, dto);
    return { message: "Email verified successfully" };
  }

  @Post("resend-verification")
  @UseGuards(JwtAuthGuard)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Resend email verification code" })
  @ApiResponse({ status: 200, description: "Verification code sent" })
  @ApiResponse({ status: 400, description: "Email already verified" })
  @ApiResponse({ status: 401, description: "Not authenticated" })
  async resendVerification(
    @GetUser() user: JwtPayload
  ): Promise<{ message: string }> {
    await this.authService.resendVerification(user.sub);
    return { message: "Verification code sent" };
  }

  @Post("forgot-password")
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Request password reset code via email" })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: "Password reset code sent (if account exists)",
  })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto
  ): Promise<{ message: string }> {
    await this.authService.forgotPassword(dto);
    return {
      message:
        "If an account exists with this email, a password reset code has been sent",
    };
  }

  @Post("reset-password")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reset password with 6-digit code" })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: "Password reset successfully" })
  @ApiResponse({ status: 400, description: "Invalid or expired code" })
  async resetPassword(
    @Body() dto: ResetPasswordDto
  ): Promise<{ message: string }> {
    await this.authService.resetPassword(dto);
    return { message: "Password reset successfully" };
  }

  @Post("change-password")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Change password (requires authentication)" })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: "Password changed successfully" })
  @ApiResponse({ status: 401, description: "Current password incorrect or not authenticated" })
  async changePassword(
    @GetUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto
  ): Promise<{ message: string }> {
    await this.authService.changePassword(user.sub, dto);
    return { message: "Password changed successfully" };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user profile" })
  @ApiResponse({ status: 200, description: "User profile retrieved" })
  @ApiResponse({ status: 401, description: "Not authenticated" })
  async getMe(@GetUser() user: JwtPayload): Promise<UserProfile> {
    return this.authService.getMe(user.sub);
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Logout (invalidate refresh token)" })
  @ApiResponse({ status: 200, description: "Successfully logged out" })
  @ApiResponse({ status: 401, description: "Not authenticated" })
  async logout(
    @GetUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response
  ): Promise<{ message: string }> {
    await this.authService.logout(user.sub);
    res.clearCookie("refresh_token", { path: "/" });
    return { message: "Successfully logged out" };
  }

  private setRefreshCookie(res: Response, refreshToken: string): void {
    const maxAge = parseExpiryToMs(
      this.configService.get<string>("JWT_REFRESH_EXPIRATION") || "7d"
    );

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge,
      path: "/",
    });
  }
}
