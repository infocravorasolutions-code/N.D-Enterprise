// controllers/authController.js
import Admin from "../models/admin.models.js";
import Manager from "../models/manager.models.js";
import { getCurrentISTTime, getCurrentISTYear, isExpiredInIST } from "../utils/timeUtils.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config(); // Ensure this is at the top
import bcrypt from "bcrypt";

export const forgotPassword = async (req, res) => {
  try {
    const { email, userType } = req.body;
    if (!email || !userType) {
      return res.status(400).json({ message: "Email and userType are required" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    let userModel = userType === "admin" ? Admin : userType === "manager" ? Manager : null;
    if (!userModel) return res.status(400).json({ message: "Invalid userType" });

    const user = await userModel.findOneAndUpdate(
      { email },
      { otp, otpExpires },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: `${userType} not found` });


    const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 465, // or 587 (for TLS)
  secure: true, // true for port 465, false for port 587
  auth: {
    user: process.env.EMAIL_USER  ,
    pass: process.env.EMAIL_PASS, // or App Password if set
  },
});


    const mailOptions = {
      from: `"YourApp Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your OTP for Password Reset",
      html: `
     <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #ffffff; max-width: 600px; margin: auto;">
  <h2 style="color: #2d2d2d; font-size: 22px;">🔐 Password Reset Request</h2>
  
  <p style="font-size: 16px; color: #555;">
    Hello,<br />
    We received a request to reset your password for your <strong>DREnterprice</strong> account.
  </p>

  <p style="font-size: 16px; color: #555;">Use the OTP below to reset your password:</p>

  <div style="font-size: 28px; font-weight: bold; color: #2d89ff; background: #f0f4ff; padding: 15px; border-radius: 6px; text-align: center; letter-spacing: 4px; margin: 20px 0;">
    ${otp}
  </div>

  <p style="font-size: 14px; color: #888;">This OTP is valid for <strong>10 minutes</strong>. Please do not share it with anyone.</p>

  <p style="font-size: 14px; color: #888;">If you didn’t request a password reset, you can safely ignore this email.</p>

  <hr style="margin: 30px 30px; border: none; border-top: 1px solid #eee;" />

  <div style="text-align: center; font-size: 13px; color: #aaa;">
    &copy; ${getCurrentISTYear()} DREnterprice. All rights reserved.<br />
  
  </div>
</div>

      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(mailOptions)

    res.status(200).json({ message: "OTP sent to your email" });

  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Error sending OTP", error: err.message });
  }
};





export const verifyOtpAndResetPassword = async (req, res) => {
  try {
    const { email, userType, otp, newPassword } = req.body;

    if (!email || !userType || !otp || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const model = userType === "admin" ? Admin : userType === "manager" ? Manager : null;
    if (!model) return res.status(400).json({ message: "Invalid user type" });

    const user = await model.findOne({ email, otp });

    if (!user) return res.status(400).json({ message: "Invalid OTP or email" });
    if (isExpiredInIST(user.otpExpires)) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    res.status(200).json({ message: "Password reset successful" });

  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Failed to reset password", error: err.message });
  }
};