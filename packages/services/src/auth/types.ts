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

// Re-export as const to help esbuild
export const JwtPayloadSymbol = Symbol("JwtPayload");
export const JwtRefreshPayloadSymbol = Symbol("JwtRefreshPayload");
