// Auth types - exported as values for esbuild compatibility
export type JwtPayload = {
  sub: string;
  email: string;
  username: string;
  roles: string[];
  iat?: number;
  exp?: number;
};

export type JwtRefreshPayload = {
  sub: string;
  iat?: number;
  exp?: number;
};

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  isEmailVerified: boolean;
  roles: string[];
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: number;
};

export type AuthResponse = {
  user: AuthUser;
  tokens: TokenPair;
};

export type RegisterData = {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
};

export type UserProfile = AuthUser & {
  createdAt: Date;
};

export interface EmailService {
  sendVerificationCode(input: {
    email: string;
    code: string;
    name?: string | null;
    expiresAt: Date;
  }): Promise<void>;
  sendPasswordResetCode(input: {
    email: string;
    code: string;
    name?: string | null;
    expiresAt: Date;
  }): Promise<void>;
}

export interface IVerificationCodeService {
  generateCode(
    userId: string,
    purpose: "email_verification" | "password_reset"
  ): Promise<{ code: string; expiresAt: Date }>;
  verifyCode(
    userId: string,
    purpose: "email_verification" | "password_reset",
    code: string
  ): Promise<void>;
}

// Re-export as const to help esbuild
export const JwtPayloadSymbol = Symbol("JwtPayload");
export const JwtRefreshPayloadSymbol = Symbol("JwtRefreshPayload");
