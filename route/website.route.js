import express from "express";
import {
  createAboutSection,
  createClientSection,
  createContactSection,
  createCreativeSection,
  createHeroSection,
  getAboutSection,
  getClientSection,
  getContactSection,
  getCreativeSection,
  getHeroSection,
  getWebsiteContent,
  updateAboutSection,
  updateClientSection,
  updateContactSection,
  updateCreativeSection,
  updateHeroSection,
} from "../controllers/website.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import upload from "../middleware/multer.middleware.js";

const router = express.Router();

router.get("/", getWebsiteContent);

router.post(
  "/hero",
  protect,
  upload.fields([{ name: "image", maxCount: 1 }]),
  createHeroSection,
);
router.put(
  "/hero",
  protect,
  upload.fields([{ name: "image", maxCount: 1 }]),
  updateHeroSection,
);
router.get("/hero", getHeroSection);

router.post(
  "/about",
  protect,
  upload.fields([{ name: "image", maxCount: 1 }]),
  createAboutSection,
);
router.put(
  "/about",
  protect,
  upload.fields([{ name: "image", maxCount: 1 }]),
  updateAboutSection,
);
router.get("/about", getAboutSection);

router.post(
  "/creative",
  protect,
  upload.fields([
    { name: "heroImage", maxCount: 1 },
    { name: "images", maxCount: 10 },
  ]),
  createCreativeSection,
);
router.put(
  "/creative",
  protect,
  upload.fields([
    { name: "heroImage", maxCount: 1 },
    { name: "images", maxCount: 10 },
  ]),
  updateCreativeSection,
);
router.get("/creative", getCreativeSection);

router.post(
  "/client",
  protect,
  upload.fields([{ name: "image", maxCount: 1 }]),
  createClientSection,
);
router.put(
  "/client",
  protect,
  upload.fields([{ name: "image", maxCount: 1 }]),
  updateClientSection,
);
router.get("/client", getClientSection);

router.post("/contact", protect, createContactSection);
router.put("/contact", protect, updateContactSection);
router.get("/contact", getContactSection);

export default router;
