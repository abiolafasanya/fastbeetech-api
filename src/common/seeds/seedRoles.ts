import mongoose from "mongoose";
import { Role } from "../../module/role/model";
import { ROLE_PERMISSIONS } from "../config/roles-permissions";
import logger from "../middleware/logger";

export async function seedRoles() {
  try {
    const entries = Object.entries(ROLE_PERMISSIONS) as [string, string[]][];
    for (const [roleName, perms] of entries) {
      await Role.findOneAndUpdate(
        { name: roleName },
        { name: roleName, permissions: perms },
        { upsert: true, new: true }
      );
      logger.info(`Seeded role: ${roleName}`);
    }
    logger.info("Role seeding completed");
  } catch (err) {
    logger.error("Role seeding error", err as any);
    throw err;
  }
}

// When run directly, connect to DB using MONGO_URI env
// if (require.main === module) {
//   const MONGO_URI =
//     process.env.MONGO_URI ||
//     process.env.MONGODB_URI ||
//     "mongodb://localhost:27017/fastbeetech";
//   mongoose
//     .connect(MONGO_URI)
//     .then(async () => {
//       await seedRoles();
//       process.exit(0);
//     })
//     .catch((err) => {
//       logger.error("Failed to seed roles", err as any);
//       process.exit(1);
//     });
// }
