// routes/authRoutes.js
import express from "express";

import { forgotPassword, verifyOtpAndResetPassword } from "../controller/auth.controller.js";

const router = express.Router();

router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtpAndResetPassword);

export default router;
