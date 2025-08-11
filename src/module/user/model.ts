import mongoose, { Schema, Document, model } from "mongoose";
import bcrypt from "bcrypt";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: "user" | "agent" | "admin";
  avatar?: string;
  listings: mongoose.Types.ObjectId[];
  comparePassword: (password: string) => Promise<boolean>;
  resetPasswordToken?: string;
  resetPasswordExpires?: number;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: number;
  phoneVerificationCode?: string;
  phoneVerificationExpires?: number;
  isPhoneVerified: boolean;
}

const UserSchema: Schema = new Schema(
  {
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, enum: ["user", "agent", "admin"], default: "user" },
    avatar: String,
    listings: [{ type: Schema.Types.ObjectId, ref: "Listing" }],
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    phone: { type: String },
    phoneVerificationCode: { type: String },
    phoneVerificationExpires: { type: Date },
    isPhoneVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};


UserSchema.pre("save", async function (this: IUser, next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});



export const User = model<IUser>("User", UserSchema);
