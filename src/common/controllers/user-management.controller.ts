import { Request, Response } from "express";
import { User } from "../../module/user/model";

export class UserManagementController {
  /**
   * Create a new user (admin action)
   * POST /api/v1/admin/users
   */
  static async createUser(req: Request, res: Response) {
    try {
      const { name, email, password, role, permissions } = req.body as {
        name: string;
        email: string;
        password: string;
        role?: string;
        permissions?: string[]; // treated as extraPermissions grants
      };

      if (!name || !email || !password) {
        return res
          .status(400)
          .json({
            status: false,
            message: "name, email and password are required",
          });
      }

      const exists = await User.findOne({ email }).lean();
      if (exists) {
        return res
          .status(400)
          .json({ status: false, message: "Email already in use" });
      }

      const user = await User.create({
        name,
        email,
        password, // hashed by pre('save') hook
        role: role || "user",
        // Store provided permissions as extra grants; effective permissions are computed in pre-save
        extraPermissions: Array.isArray(permissions) ? permissions : [],
      });

      const safe = await User.findById(user._id).select("-password");
      return res.status(201).json({
        status: true,
        message: "User created successfully",
        data: safe,
      });
    } catch (err: any) {
      return res.status(400).json({
        status: false,
        message: err?.message || "Failed to create user",
      });
    }
  }

  /**
   * Get users list (admin)
   * GET /api/v1/admin/users
   */
  static async getUsers(req: Request, res: Response) {
    try {
      const {
        page = "1",
        limit = "20",
        search = "",
        role,
      } = req.query as Record<string, string>;
      const pageNum = Math.max(parseInt(page as string, 10) || 1, 1);
      const limitNum = Math.min(
        Math.max(parseInt(limit as string, 10) || 20, 1),
        100
      );

      const filter: any = {};
      if (role) filter.role = role;
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      const [items, total] = await Promise.all([
        User.find(filter)
          .select("-password")
          .sort({ createdAt: -1 })
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum),
        User.countDocuments(filter),
      ]);

      return res.json({
        status: true,
        data: items,
        meta: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (err: any) {
      return res.status(400).json({
        status: false,
        message: err?.message || "Failed to fetch users",
      });
    }
  }

  /**
   * Get a single user by id (admin)
   * GET /api/v1/admin/users/:userId
   */
  static async getUserById(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const user = await User.findById(userId).select("-password");
      if (!user) {
        return res
          .status(404)
          .json({ status: false, message: "User not found" });
      }
      return res.json({ status: true, data: user });
    } catch (err: any) {
      return res.status(400).json({
        status: false,
        message: err?.message || "Failed to get user",
      });
    }
  }

  /**
   * Update user (admin)
   * PUT /api/v1/admin/users/:userId
   */
  static async updateUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { name, email, role, permissions } = req.body as Partial<{
        name: string;
        email: string;
        role: string;
        permissions: string[];
      }>;

      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (email !== undefined) updates.email = email;
      if (role !== undefined) updates.role = role;
      if (permissions !== undefined) updates.extraPermissions = permissions;

      const user = await User.findByIdAndUpdate(userId, updates, {
        new: true,
        runValidators: true,
      }).select("-password");

      if (!user) {
        return res
          .status(404)
          .json({ status: false, message: "User not found" });
      }

      return res.json({ status: true, message: "User updated", data: user });
    } catch (err: any) {
      return res.status(400).json({
        status: false,
        message: err?.message || "Failed to update user",
      });
    }
  }

  /**
   * Delete user (admin)
   * DELETE /api/v1/admin/users/:userId
   */
  static async deleteUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const deleted = await User.findByIdAndDelete(userId);
      if (!deleted) {
        return res
          .status(404)
          .json({ status: false, message: "User not found" });
      }
      return res.json({ status: true, message: "User deleted" });
    } catch (err: any) {
      return res.status(400).json({
        status: false,
        message: err?.message || "Failed to delete user",
      });
    }
  }
}

export default UserManagementController;
