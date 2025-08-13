// types/express/index.d.ts
import { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
     interface UserJwtPayload {
       id: string;
       email: string;
       role: "admin" | "editor" | "author" | "viewer";
       permissions?: string[]; // optional fine-grained permissions
       isEmailVerified?: boolean;
       iat?: number;
       exp?: number;
     }
    interface Request {
      user?: JwtPayload & UserJwtPayload;
    }
  }
}

export {};
