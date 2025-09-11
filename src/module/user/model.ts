import mongoose, { Schema, Document, model, Types } from "mongoose";
import bcrypt from "bcrypt";
import {
  UserRole,
  getRolePermissions,
} from "../../common/config/roles-permissions";

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  // password can be omitted from query results, so mark optional for TS when not selected
  password?: string;
  phone?: string;
  // Backwards compatible single role (legacy). Prefer `roles` for multi-role support.
  role?: UserRole;
  // Roles (new): support multiple roles per user
  roles?: Types.ObjectId[];
  // Effective permissions stored on user (computed from roles + extraPermissions)
  permissions: string[];
  // Additional per-user grants (not role-based)
  extraPermissions?: string[];
  avatar?: string;
  listings: mongoose.Types.ObjectId[];

  resetPasswordToken?: string;
  resetPasswordExpires?: number | Date;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: number | Date;
  phoneVerificationCode?: string;
  phoneVerificationExpires?: Date;
  createdAt?: number | Date;
  isPhoneVerified: boolean;

  comparePassword: (password: string) => Promise<boolean>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    name: { type: String, trim: true, required: true },
    email: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      required: true,
      index: true,
    },

    // HIDE by default; explicitly select it only when needed
    password: { type: String, required: true, minlength: 6, select: false },

    role: {
      type: String,
      enum: [
        "user",
        "student",
        "instructor",
        "author",
        "editor",
        "moderator",
        "admin",
        "super-admin",
      ],
      default: "user",
      index: true,
    },
    // New multi-role support
    roles: [{ type: Schema.Types.ObjectId, ref: "Role" }],
    // Effective permissions cached on the user document
    permissions: [{ type: String }],
    // Extra per-user permissions (grants)
    extraPermissions: [{ type: String }],

    avatar: { type: String },
    phone: { type: String, trim: true },

    // All secrets/tokens hidden by default
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },

    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },

    phoneVerificationCode: { type: String, select: false },
    phoneVerificationExpires: { type: Date, select: false },

    isPhoneVerified: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      // No need to delete fields; they aren't selected at all.
      transform(_doc, ret) {
        // Optional: normalize id
        ret.id = ret._id?.toString();
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  // `this.password` might be undefined if doc wasn't loaded with +password
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Permission checking methods
UserSchema.methods.hasPermission = function (permission: string): boolean {
  return this.permissions.includes(permission);
};

UserSchema.methods.hasAnyPermission = function (
  permissions: string[]
): boolean {
  return permissions.some((permission) =>
    this.permissions.includes(permission)
  );
};

UserSchema.methods.hasAllPermissions = function (
  permissions: string[]
): boolean {
  return permissions.every((permission) =>
    this.permissions.includes(permission)
  );
};

// Pre-save middleware to assign role-based permissions
UserSchema.pre("save", async function (this: IUser, next) {
  // Compute effective permissions from either legacy single `role` or new `roles` array
  try {
    let computedPermissions: string[] = [];

    // If roles array present, populate permissions from Role documents
    if (this.roles && this.roles.length > 0) {
      // Resolve Role model lazily to avoid circular imports
      const { Role } = await import("../role/model.js");
      const roles = await Role.find({ _id: { $in: this.roles } }).lean();
      roles.forEach((r: any) => {
        if (Array.isArray(r.permissions))
          r.permissions.forEach((p: string) => computedPermissions.push(p));
      });
    } else if (this.role) {
      // Fallback: legacy single role
      const rolePermissions = getRolePermissions(this.role);
      computedPermissions = [...rolePermissions];
    }

    // Merge extraPermissions and any manually set permissions (dedupe)
    const extras = Array.isArray(this.extraPermissions)
      ? this.extraPermissions
      : [];
    const manual = Array.isArray(this.permissions) ? this.permissions : [];

    const permissionSet = new Set<string>([
      ...computedPermissions,
      ...extras,
      ...manual,
    ]);
    this.permissions = Array.from(permissionSet);
  } catch (err) {
    return next(err as any);
  }

  // Hash password if modified
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password!, salt);
  next();
});

export const User = model<IUser>("User", UserSchema);
