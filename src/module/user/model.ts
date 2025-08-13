import mongoose, { Schema, Document, model, Types } from "mongoose";
import bcrypt from "bcrypt";

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  // password can be omitted from query results, so mark optional for TS when not selected
  password?: string;
  phone?: string;
  role: "user" | "author" | "editor" | "admin";
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
      enum: ["user", "author", "editor", "admin"],
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

UserSchema.pre("save", async function (this: IUser, next) {
  // When using select:false, `this.password` is present on newly created docs
  // and on docs loaded with .select('+password')
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password!, salt);
  next();
});

export const User = model<IUser>("User", UserSchema);
