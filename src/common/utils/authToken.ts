// utils/authToken.ts
import jwt from "jsonwebtoken";
import { HydratedDocument } from "mongoose";
import { IUser } from "../../module/user/model";

export function signAuthToken(user: HydratedDocument<IUser>) {
  const payload = {
    id: user.id, // <-- always a string virtual; no TS error
    email: user.email,
    name: user.name ?? "",
    role: user.role,
    permissions: user.permissions ?? [],
    isEmailVerified: !!user.isEmailVerified,
  };

  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "7d" });
}
