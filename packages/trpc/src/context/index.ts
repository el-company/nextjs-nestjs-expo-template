import { Request, Response } from "express";

// Define auth data structure
export interface AuthData {
  userId: string | null;
  isAuthenticated: boolean;
  user?: {
    id: string;
    email: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
    roles: string[];
  } | null;
}

// Define context type
export interface TRPCContext {
  req: Request;
  res: Response;
  auth: AuthData;
}
