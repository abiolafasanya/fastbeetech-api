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
  role: UserRole;
  permissions: string[];
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
    permissions: { type: [String], default: [] },

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
  // Assign permissions based on role if permissions are empty or role has changed
  if (this.isModified("role") || this.permissions.length === 0) {
    const rolePermissions = getRolePermissions(this.role);
    // Merge role permissions with any additional custom permissions
    const customPermissions = this.permissions.filter(
      (p) => !rolePermissions.includes(p as any)
    );
    this.permissions = [...rolePermissions, ...customPermissions];
  }

  // Hash password if modified
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password!, salt);
  next();
});

export const User = model<IUser>("User", UserSchema);
