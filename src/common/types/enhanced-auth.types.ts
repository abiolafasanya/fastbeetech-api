// enhanced-auth.types.ts - Type definitions for enhanced authentication
import type { JwtPayload } from "jsonwebtoken";
import { UserRole } from "../config/roles-permissions";

declare global {
  namespace Express {
    interface UserJwtPayload {
      id: string;
      email: string;
      role: UserRole;
      permissions?: string[];
      iat?: number;
      exp?: number;
    }

    interface User extends UserJwtPayload {}

    interface Request {
      user?: JwtPayload & UserJwtPayload;
      rateLimit?: number;
    }
  }
}
