import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { User } from "./src/module/user/model";
import { Role } from "./src/module/role/model";
import { authenticate } from "./src/common/middleware/auth";
import userPermissionsRoute from "./src/common/routes/user-permissions.route";

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
mongoose
  .connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fastbeetech")
  .then(() => {
    console.log("✅ Connected to MongoDB");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });

// Test route - no auth required
app.get("/api/v1/test", (req, res) => {
  res.json({
    status: true,
    message: "RBAC System Test API",
    timestamp: new Date().toISOString(),
  });
});

// Test route - get all roles (for testing)
app.get("/api/v1/roles", async (req, res) => {
  try {
    const roles = await Role.find({}).select("name title permissions");
    res.json({
      status: true,
      data: roles,
      count: roles.length,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error fetching roles",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Test route - get all users (for testing)
app.get("/api/v1/users", async (req, res) => {
  try {
    const users = await User.find({})
      .select("name email role roles permissions extraPermissions")
      .populate("roles", "name permissions");
    res.json({
      status: true,
      data: users,
      count: users.length,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error fetching users",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Permission routes (requires auth)
app.use("/api/v1/me/permissions", authenticate, userPermissionsRoute);

// Test protected route
app.get("/api/v1/protected", authenticate, (req: any, res) => {
  res.json({
    status: true,
    message: "This is a protected route",
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      permissions: req.user.permissions,
    },
  });
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    system: "RBAC Test Server",
  });
});

app.listen(PORT, () => {
  console.log(`🚀 RBAC Test Server running on http://localhost:${PORT}`);
  console.log(`📊 Test endpoints:`);
  console.log(`   GET /health - Health check`);
  console.log(`   GET /api/v1/test - Simple test`);
  console.log(`   GET /api/v1/roles - View all roles`);
  console.log(`   GET /api/v1/users - View all users`);
  console.log(`   GET /api/v1/protected - Protected route (requires auth)`);
  console.log(
    `   GET /api/v1/me/permissions - User permissions (requires auth)`
  );
});

export default app;
