import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { PostHogService } from "@repo/analytics";
import type {
  JwtPayload,
  TokenPair,
  AuthResponse,
  UserProfile,
  EmailService,
  AuthUser,
} from "./types.js";
import {
  RegisterDto,
  LoginDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from "./dto/index.js";
import { EMAIL_SERVICE, USER_REPOSITORY } from "./tokens.js";
import { parseExpiryToMs } from "./utils.js";

// Repository interface - to be implemented by the consumer
export interface UserRepository {
  findByEmail(email: string): Promise<UserEntity | null>;
  findByUsername(username: string): Promise<UserEntity | null>;
  findById(id: string): Promise<UserEntity | null>;
  findByEmailVerificationToken(token: string): Promise<UserEntity | null>;
  findByPasswordResetToken(token: string): Promise<UserEntity | null>;
  create(data: CreateUserData): Promise<UserEntity>;
  update(id: string, data: Partial<UserEntity>): Promise<UserEntity>;
  getRoleByName(name: string): Promise<RoleEntity | null>;
}

export interface UserEntity {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  isEmailVerified: boolean;
  emailVerificationToken: string | null;
  emailVerificationExpires: Date | null;
  passwordResetToken: string | null;
  passwordResetExpires: Date | null;
  refreshToken: string | null;
  refreshTokenExpires: Date | null;
  roles: RoleEntity[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleEntity {
  id: string;
  name: string;
  description: string | null;
}

export interface CreateUserData {
  email: string;
  username: string;
  passwordHash: string;
  firstName?: string | null;
  lastName?: string | null;
  emailVerificationToken: string;
  emailVerificationExpires: Date;
  roles: RoleEntity[];
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 12;
  private readonly ACCESS_TOKEN_EXPIRY: string;
  private readonly REFRESH_TOKEN_EXPIRY: string;
  private readonly REFRESH_TOKEN_SECRET: string;

  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly analyticsService?: PostHogService,
    @Inject(EMAIL_SERVICE) private readonly emailService?: EmailService
  ) {
    this.ACCESS_TOKEN_EXPIRY =
      this.configService.get<string>("JWT_ACCESS_EXPIRATION") || "15m";
    this.REFRESH_TOKEN_EXPIRY =
      this.configService.get<string>("JWT_REFRESH_EXPIRATION") || "7d";
    const refreshSecret = this.configService.get<string>("JWT_REFRESH_SECRET");
    if (!refreshSecret) {
      throw new Error("JWT_REFRESH_SECRET environment variable is not set");
    }
    this.REFRESH_TOKEN_SECRET = refreshSecret;
  }

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const repo = this.userRepository;

    // Check if email already exists
    const existingEmail = await repo.findByEmail(dto.email);
    if (existingEmail) {
      throw new ConflictException("Email already registered");
    }

    // Check if username already exists
    const existingUsername = await repo.findByUsername(dto.username);
    if (existingUsername) {
      throw new ConflictException("Username already taken");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString("hex");
    const emailVerificationTokenHash = this.hashToken(emailVerificationToken);
    const emailVerificationExpires = new Date(
      Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    );

    // Get default user role
    const userRole = await repo.getRoleByName("user");
    if (!userRole) {
      throw new Error("Default user role not found");
    }

    // Create user
    let user: UserEntity;
    try {
      user = await repo.create({
        email: dto.email,
        username: dto.username,
        passwordHash,
        firstName: dto.firstName || null,
        lastName: dto.lastName || null,
        emailVerificationToken: emailVerificationTokenHash,
        emailVerificationExpires,
        roles: [userRole],
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException("Email or username already registered");
      }
      throw error;
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Save refresh token
    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, this.SALT_ROUNDS);
    await repo.update(user.id, {
      refreshToken: refreshTokenHash,
      refreshTokenExpires: new Date(Date.now() + parseExpiryToMs(this.REFRESH_TOKEN_EXPIRY)),
    });

    // Track analytics
    this.trackEvent(user.id, "user_registered", {
      email: user.email,
      username: user.username,
    });

    this.logger.log(`User registered: ${user.email}`);

    return this.buildAuthResponse(user, tokens);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const repo = this.userRepository;

    const user = await repo.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Save refresh token
    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, this.SALT_ROUNDS);
    await repo.update(user.id, {
      refreshToken: refreshTokenHash,
      refreshTokenExpires: new Date(Date.now() + parseExpiryToMs(this.REFRESH_TOKEN_EXPIRY)),
    });

    // Track analytics
    this.trackEvent(user.id, "user_logged_in", {
      email: user.email,
    });

    this.logger.log(`User logged in: ${user.email}`);

    return this.buildAuthResponse(user, tokens);
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const repo = this.userRepository;

    // Verify the refresh token
    let payload: { sub: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.REFRESH_TOKEN_SECRET,
        audience: "refresh",
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const user = await repo.findById(payload.sub);
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    // Check if refresh token matches
    const isRefreshTokenValid = await bcrypt.compare(
      refreshToken,
      user.refreshToken
    );
    if (!isRefreshTokenValid) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    // Check if refresh token is expired
    if (user.refreshTokenExpires && user.refreshTokenExpires < new Date()) {
      throw new UnauthorizedException("Refresh token expired");
    }

    // Generate new tokens
    const tokens = await this.generateTokens(user);

    // Save new refresh token
    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, this.SALT_ROUNDS);
    await repo.update(user.id, {
      refreshToken: refreshTokenHash,
      refreshTokenExpires: new Date(Date.now() + parseExpiryToMs(this.REFRESH_TOKEN_EXPIRY)),
    });

    this.logger.debug(`Tokens refreshed for user: ${user.email}`);

    return tokens;
  }

  async logout(userId: string): Promise<void> {
    const repo = this.userRepository;

    await repo.update(userId, {
      refreshToken: null,
      refreshTokenExpires: null,
    });

    this.trackEvent(userId, "user_logged_out", {});
    this.logger.log(`User logged out: ${userId}`);
  }

  async getMe(userId: string): Promise<UserProfile> {
    const repo = this.userRepository;

    const user = await repo.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      isEmailVerified: user.isEmailVerified,
      roles: user.roles.map((r) => r.name),
      createdAt: user.createdAt,
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const repo = this.userRepository;

    const user = await repo.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const isPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException("Current password is incorrect");
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, this.SALT_ROUNDS);
    await repo.update(userId, { passwordHash: newPasswordHash });

    this.trackEvent(userId, "password_changed", {});
    this.logger.log(`Password changed for user: ${user.email}`);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const repo = this.userRepository;

    const user = await repo.findByEmail(dto.email);
    if (!user) {
      // Don't reveal if email exists
      this.logger.debug(`Forgot password requested for non-existent email: ${dto.email}`);
      return;
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = this.hashToken(resetToken);
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await repo.update(user.id, {
      passwordResetToken: resetTokenHash,
      passwordResetExpires: resetTokenExpires,
    });

    if (this.emailService) {
      try {
        const webAppUrl =
          this.configService.get<string>("WEB_APP_URL") ||
          "http://localhost:3000";
        const resetUrl = `${webAppUrl}/reset-password?token=${resetToken}`;
        await this.emailService.sendPasswordResetEmail({
          email: user.email,
          resetToken,
          resetUrl,
          expiresAt: resetTokenExpires,
        });
      } catch (error) {
        this.logger.error(
          `Failed to send password reset email for ${user.email}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    } else {
      this.logger.warn(
        "EmailService not configured; password reset email was not sent."
      );
    }

    this.trackEvent(user.id, "password_reset_requested", {});
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const repo = this.userRepository;

    const tokenHash = this.hashToken(dto.token);
    const user = await repo.findByPasswordResetToken(tokenHash);
    if (!user) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    if (user.passwordResetExpires && user.passwordResetExpires < new Date()) {
      throw new BadRequestException("Reset token has expired");
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, this.SALT_ROUNDS);
    await repo.update(user.id, {
      passwordHash: newPasswordHash,
      passwordResetToken: null,
      passwordResetExpires: null,
    });

    this.trackEvent(user.id, "password_reset_completed", {});
    this.logger.log(`Password reset completed for: ${user.email}`);
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<void> {
    const repo = this.userRepository;

    const tokenHash = this.hashToken(dto.token);
    const user = await repo.findByEmailVerificationToken(tokenHash);
    if (!user) {
      throw new BadRequestException("Invalid verification token");
    }

    if (
      user.emailVerificationExpires &&
      user.emailVerificationExpires < new Date()
    ) {
      throw new BadRequestException("Verification token has expired");
    }

    await repo.update(user.id, {
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    });

    this.trackEvent(user.id, "email_verified", {});
    this.logger.log(`Email verified for: ${user.email}`);
  }

  async validateToken(token: string): Promise<JwtPayload | null> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        audience: "access",
      });
      return payload;
    } catch {
      return null;
    }
  }

  private async generateTokens(user: UserEntity): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      roles: user.roles.map((r) => r.name),
    };

    const accessTokenExpiresIn = this.ACCESS_TOKEN_EXPIRY as `${number}${"s" | "m" | "h" | "d"}`;
    const refreshTokenExpiresIn = this.REFRESH_TOKEN_EXPIRY as `${number}${"s" | "m" | "h" | "d"}`;
    const expiresInMs = parseExpiryToMs(this.ACCESS_TOKEN_EXPIRY);
    const expiresAt = Date.now() + expiresInMs;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload as Record<string, unknown>, {
        expiresIn: accessTokenExpiresIn,
        audience: "access",
      }),
      this.jwtService.signAsync(
        { sub: user.id } as Record<string, unknown>,
        {
          expiresIn: refreshTokenExpiresIn,
          secret: this.REFRESH_TOKEN_SECRET,
          audience: "refresh",
        }
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: expiresInMs,
      expiresAt,
    };
  }

  private buildAuthResponse(user: UserEntity, tokens: TokenPair): AuthResponse {
    return {
      user: this.buildAuthUser(user),
      tokens,
    };
  }

  private buildAuthUser(user: UserEntity): AuthUser {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      isEmailVerified: user.isEmailVerified,
      roles: user.roles.map((r) => r.name),
    };
  }

  private trackEvent(
    userId: string,
    event: string,
    properties: Record<string, unknown>
  ): void {
    if (this.analyticsService) {
      this.analyticsService
        .capture(userId, event, {
          ...properties,
          timestamp: new Date().toISOString(),
        })
        .catch((err) => {
          this.logger.error(`Failed to track ${event}: ${err.message}`);
        });
    }
  }

  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  private isUniqueConstraintError(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;
    const err = error as { code?: string };
    return err.code === "23505";
  }
}
