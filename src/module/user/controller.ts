import { Request, Response } from "express";
import { User } from "./model";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
  BadRequestException,
  UnauthorizedException,
} from "../../common/middleware/errors";
import { sendEmail } from "../../common/utils/sendEmail";
import { signAuthToken } from "../../common/utils/authToken";

class AuthController {
  register = async (req: Request, res: Response) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already in use" });

    // Prevent privilege escalation (allow only specific roles at signup)
    const allowedSignupRoles = new Set(["user", "agent"]); // expand if desired
    const safeRole = allowedSignupRoles.has(role) ? role : "user";

    const user = await User.create({
      name,
      email,
      password, // will be hashed by pre('save')
      role: safeRole,
      permissions: [], // default empty; assign later via admin if needed
    });

    // JWT
    const token = signAuthToken(user);

    // Email verification
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = Date.now() + 1000 * 60 * 60 * 24; // 24 hours
    await user.save();

    const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}&email=${encodeURIComponent(
      email
    )}`;

    await sendEmail({
      to: user.email,
      type: "verify",
      data: {
        name: user.name,
        verificationUrl,
      },
    });

    // Cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      domain: ".fastbeetech.com",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      status: true,
      message: "Registration successful",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
          avatar: user.avatar,
          isEmailVerified: user.isEmailVerified,
        },
      },
    });
  };

  verifyEmail = async (req: Request, res: Response) => {
    const { token, email } = req.query;
    if (!token || !email) {
      return res.status(400).json({ message: "Invalid verification link" });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token as string)
      .digest("hex");

    const user = await User.findOne({
      email,
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired verification token" });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    await sendEmail({
      to: user.email,
      type: "onboarding",
      data: { name: user.name },
    });

    res.json({ message: "Email verified successfully" });
  };

  login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password)
      throw new BadRequestException("Email and password required");

    // login
    const user = await User.findOne({ email }).select("+password");
    if (!user) throw new UnauthorizedException("Invalid credentials");

    const isMatch = await bcrypt.compare(password, user.password!);
    if (!isMatch) throw new UnauthorizedException("Invalid credentials");

    const token = signAuthToken(user);
const isProd = process.env.NODE_ENV === "production";
    res.cookie("token", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      domain: isProd ? ".fastbeetech.com": undefined, // set domain only in production
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      status: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
          avatar: user.avatar,
          isEmailVerified: user.isEmailVerified,
        },
      },
    });
  };

  logout = (req: Request, res: Response) => {
    res.clearCookie("token", { path: "/" });
    res.json({ status: true, message: "Logged out successfully" });
  };

  me = async (req: Request, res: Response) => {
    if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      status: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
        phone: user.phone,
        isPhoneVerified: user.isPhoneVerified,
        createdAt: user.createdAt,
      },
    });
  };

  updateProfile = async (req: Request, res: Response) => {
    const { name, phone, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user?.id,
      { name, phone, avatar },
      { new: true, runValidators: true }
    ).select("-password");
    res.json({ status: true, data: user, message: "Profile Updated" });
  };

  changePassword = async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch)
      return res.status(400).json({ message: "Incorrect current password" });

    user.password = newPassword; // pre('save') will hash
    await user.save();
    res.json({ message: "Password updated successfully" });
  };

  forgotPassword = async (req: Request, res: Response) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always send same response
    if (!user) {
      return res
        .status(200)
        .json({ message: "If account exists, a reset email has been sent." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    user.resetPasswordToken = hashedToken as any;
    user.resetPasswordExpires = Date.now() + 1000 * 60 * 15;
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}&email=${encodeURIComponent(
      email
    )}`;
    await sendEmail({
      to: user.email,
      type: "reset-password",
      data: { resetUrl },
    });

    res.json({ message: "Password reset link sent." });
  };

  resetPassword = async (req: Request, res: Response) => {
    const { email, token, password } = req.body;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      email,
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ message: "Invalid or expired token." });

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined as any;
    await user.save();

    res.json({ message: "Password successfully reset." });
  };

  requestPhoneVerificationCode = async (req: Request, res: Response) => {
    const user = await User.findById(req.user?.id);
    if (!user || !user.phone) {
      return res.status(400).json({ message: "Phone number not found" });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.phoneVerificationCode = code;
    user.phoneVerificationExpires = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    await sendEmail({
      to: user.email,
      type: "phone-verification",
      data: { code },
    });

    res.json({ message: "Verification code sent to your email." });
  };

  verifyPhoneCode = async (req: Request, res: Response) => {
    const { code } = req.body;
    const user = await User.findById(req.user?.id);

    if (
      !user ||
      user.phoneVerificationCode !== code ||
      !user.phoneVerificationExpires ||
      user.phoneVerificationExpires.getTime() < Date.now()
    ) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    user.isPhoneVerified = true;
    user.phoneVerificationCode = undefined;
    user.phoneVerificationExpires = undefined as any;
    await user.save();

    res.json({ message: "Phone number verified successfully" });
  };
}

export default new AuthController();
