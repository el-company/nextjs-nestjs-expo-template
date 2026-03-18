import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { PostHogService } from "@repo/analytics";
import type { JwtPayload } from "./types.js";
import {
  RegisterDto,
  LoginDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from "./dto/index.js";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
    isEmailVerified: boolean;
    roles: string[];
  };
  tokens: TokenPair;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  isEmailVerified: boolean;
  roles: string[];
  createdAt: Date;
}

// Repository interface - to be implemented by the consumer
export interface UserRepository {
  findByEmail(email: string): Promise<UserEntity | null>;
  findByUsername(username: string): Promise<UserEntity | null>;
  findById(id: string): Promise<UserEntity | null>;
  findByEmailVerificationToken(token: string): Promise<UserEntity | null>;
  findByPasswordResetToken(token: string): Promise<UserEntity | null>;
  findByRefreshToken(refreshToken: string): Promise<UserEntity | null>;
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
  private userRepository: UserRepository | null = null;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly analyticsService?: PostHogService
  ) {
    this.ACCESS_TOKEN_EXPIRY =
      this.configService.get<string>("JWT_ACCESS_EXPIRATION") || "15m";
    this.REFRESH_TOKEN_EXPIRY =
      this.configService.get<string>("JWT_REFRESH_EXPIRATION") || "7d";
  }

  setUserRepository(repository: UserRepository): void {
    this.userRepository = repository;
  }

  private getRepository(): UserRepository {
    if (!this.userRepository) {
      throw new Error(
        "UserRepository not set. Call setUserRepository first."
      );
    }
    return this.userRepository;
  }

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const repo = this.getRepository();

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
    const emailVerificationExpires = new Date(
      Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    );

    // Get default user role
    const userRole = await repo.getRoleByName("user");
    if (!userRole) {
      throw new Error("Default user role not found");
    }

    // Create user
    const user = await repo.create({
      email: dto.email,
      username: dto.username,
      passwordHash,
      firstName: dto.firstName || null,
      lastName: dto.lastName || null,
      emailVerificationToken,
      emailVerificationExpires,
      roles: [userRole],
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Save refresh token
    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, this.SALT_ROUNDS);
    await repo.update(user.id, {
      refreshToken: refreshTokenHash,
      refreshTokenExpires: new Date(Date.now() + this.parseExpiry(this.REFRESH_TOKEN_EXPIRY)),
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
    const repo = this.getRepository();

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
      refreshTokenExpires: new Date(Date.now() + this.parseExpiry(this.REFRESH_TOKEN_EXPIRY)),
    });

    // Track analytics
    this.trackEvent(user.id, "user_logged_in", {
      email: user.email,
    });

    this.logger.log(`User logged in: ${user.email}`);

    return this.buildAuthResponse(user, tokens);
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const repo = this.getRepository();

    // Verify the refresh token
    let payload: { sub: string };
    try {
      payload = this.jwtService.verify(refreshToken);
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
      refreshTokenExpires: new Date(Date.now() + this.parseExpiry(this.REFRESH_TOKEN_EXPIRY)),
    });

    this.logger.debug(`Tokens refreshed for user: ${user.email}`);

    return tokens;
  }

  async logout(userId: string): Promise<void> {
    const repo = this.getRepository();

    await repo.update(userId, {
      refreshToken: null,
      refreshTokenExpires: null,
    });

    this.trackEvent(userId, "user_logged_out", {});
    this.logger.log(`User logged out: ${userId}`);
  }

  async getMe(userId: string): Promise<UserProfile> {
    const repo = this.getRepository();

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
    const repo = this.getRepository();

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
    const repo = this.getRepository();

    const user = await repo.findByEmail(dto.email);
    if (!user) {
      // Don't reveal if email exists
      this.logger.debug(`Forgot password requested for non-existent email: ${dto.email}`);
      return;
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await repo.update(user.id, {
      passwordResetToken: resetToken,
      passwordResetExpires: resetTokenExpires,
    });

    // TODO: Send email with reset link
    this.logger.log(`Password reset token generated for: ${user.email}`);
    this.logger.debug(`Reset token: ${resetToken}`); // Remove in production

    this.trackEvent(user.id, "password_reset_requested", {});
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const repo = this.getRepository();

    const user = await repo.findByPasswordResetToken(dto.token);
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
    const repo = this.getRepository();

    const user = await repo.findByEmailVerificationToken(dto.token);
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
      const payload = this.jwtService.verify<JwtPayload>(token);
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

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload as Record<string, unknown>, {
        expiresIn: this.ACCESS_TOKEN_EXPIRY as `${number}${"s" | "m" | "h" | "d"}`,
      }),
      this.jwtService.signAsync(
        { sub: user.id } as Record<string, unknown>,
        { expiresIn: this.REFRESH_TOKEN_EXPIRY as `${number}${"s" | "m" | "h" | "d"}` }
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiry(this.ACCESS_TOKEN_EXPIRY),
    };
  }

  private buildAuthResponse(user: UserEntity, tokens: TokenPair): AuthResponse {
    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
        isEmailVerified: user.isEmailVerified,
        roles: user.roles.map((r) => r.name),
      },
      tokens,
    };
  }

  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 15 * 60 * 1000; // default 15 minutes
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case "s":
        return value * 1000;
      case "m":
        return value * 60 * 1000;
      case "h":
        return value * 60 * 60 * 1000;
      case "d":
        return value * 24 * 60 * 60 * 1000;
      default:
        return 15 * 60 * 1000;
    }
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
}
