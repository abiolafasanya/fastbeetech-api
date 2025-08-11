import { Request, Response } from "express";
import { User } from "./model";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import {
  BadRequestException,
  UnauthorizedException,
} from "../../common/middleware/errors";
import { sendEmail } from "../../common/utils/sendEmail";

class AuthController {
  register = async (req: Request, res: Response) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already in use" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || "user",
    });

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = Date.now() + 1000 * 60 * 60 * 24; // 24 hours
    await user.save();

    const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}&email=${email}`;

    await sendEmail({
      to: user.email,
      type: "verify",
      data: {
        name: user.name,
        verificationUrl,
      },
    });

    // ✅ Set token in cookie
    res.cookie("token", token, {
      httpOnly: true, // Prevent access from client-side JS
      secure: process.env.NODE_ENV === "production", // Use HTTPS in production
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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
          avatar: user.avatar,
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

    const user = await User.findOne({ email });
    if (!user) throw new UnauthorizedException("Invalid credentials");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedException("Invalid credentials");

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    // ✅ Set token in cookie
    res.cookie("token", token, {
      httpOnly: true, // Prevent access from client-side JS
      secure: process.env.NODE_ENV === "production", // Use HTTPS in production
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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
          avatar: user.avatar,
        },
      },
    });
  };

  logout = (req: Request, res: Response) => {
    res.clearCookie("token", { path: "/" });
    res.json({ status: true, message: "Logged out successfully" });
  };

  me = async (req: Request, res: Response) => {
    const user = await User.findById(req.user?.id).select("-password");
    res.json({ status: true, data: user });
  };

  updateProfile = async (req: Request, res: Response) => {
    const { name, phone, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user?.id,
      { name, phone, avatar },
      { new: true }
    );
    res.json({ status: true, data: user, message: "Profile Updated" });
  };

  changePassword = async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch)
      return res.status(400).json({ message: "Incorrect current password" });

    user.password = newPassword;
    await user.save();
    res.json({ message: "Password updated successfully" });
  };

  forgotPassword = async (req: Request, res: Response) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always send same response to prevent email enumeration
    if (!user) {
      return res
        .status(200)
        .json({ message: "If account exists, a reset email has been sent." });
    }

    // Generate secure random token and hash it
    const token = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 1000 * 60 * 15; // 15 minutes
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}&email=${email}`;
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
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password successfully reset." });
  };

  requestPhoneVerificationCode = async (req: Request, res: Response) => {
    const user = await User.findById(req.user?.id);
    if (!user || !user.phone) {
      return res.status(400).json({ message: "Phone number not found" });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
    user.phoneVerificationCode = code;
    user.phoneVerificationExpires = Date.now() + 1000 * 60 * 5; // 5 minutes
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
      user.phoneVerificationExpires < Date.now()
    ) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    user.isPhoneVerified = true;
    user.phoneVerificationCode = undefined;
    user.phoneVerificationExpires = undefined;
    await user.save();

    res.json({ message: "Phone number verified successfully" });
  };
}

export default new AuthController();
