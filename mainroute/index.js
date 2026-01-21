import { Router } from "express";

import authRoutes from "../route/auth.route.js";
import userRoutes from "../route/user.route.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
export default router;
