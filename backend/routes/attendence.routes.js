import express from "express";
import multer from "multer";
import {
  markStepIn,
  markStepOut,
  getEmployeeAttendance,
  getAllAttendance,
  updateAttendance,
  bulkUpdateAttendance,
  bulkStepIn,
  deleteAttendance,
  getAttendanceSummary
} from "../controller/attendence.controller.js";
import { authenticateUser } from "../utils/middlewere.js";

const router = express.Router();

import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Get __dirname equivalent in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



// Define upload directory path (goes up one level from current file)
const uploadDir = path.join(__dirname, "../upload");

// Create upload directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // Use the resolved path
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

// Step in: upload single image
router.post("/step-in", authenticateUser,upload.single("stepInImage"), markStepIn);

// Update attendance by attendance ID (supports all fields including stepOut)
router.put("/:attendanceId", authenticateUser,upload.single("stepInImage"), updateAttendance);

// Delete attendance by attendance ID
router.delete("/:attendanceId", authenticateUser, deleteAttendance);

// bulk update
router.post("/bulk-update", authenticateUser, bulkUpdateAttendance);

// bulk step-in (Admin only - mohit123456rathod@gmail.com)
router.post("/bulk-step-in", upload.single("stepInImage"), bulkStepIn);

// Step out: parse FormData with no file
router.post("/step-out", authenticateUser, upload.none(), markStepOut);

// Get attendance summary (count by date and shift)
router.get("/summary", authenticateUser, getAttendanceSummary);

// 
router.get("/", authenticateUser, getAllAttendance);

// Add this route for fetching attendance by employeeId
router.get("/:employeeId", authenticateUser, getEmployeeAttendance);



export default router;
