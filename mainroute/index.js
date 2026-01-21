import { Router } from "express";

import authRoutes from "../route/auth.route.js";
import userRoutes from "../route/user.route.js";
import websiteRoutes from "../route/website.route.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/website", websiteRoutes);
export default router;
