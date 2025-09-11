import mongoose, { Schema, Document, model } from "mongoose";
import {
  UserRole,
  Permission,
  ROLE_PERMISSIONS,
} from "../../common/config/roles-permissions";

export interface IRole extends Document {
  name: UserRole;
  title?: string;
  permissions: Permission[];
  createdAt?: Date;
  updatedAt?: Date;
}

const RoleSchema: Schema<IRole> = new Schema(
  {
    name: { type: String, required: true, unique: true },
    title: { type: String },
    permissions: [{ type: String }],
  },
  { timestamps: true }
);

export const Role = model<IRole>("Role", RoleSchema);
