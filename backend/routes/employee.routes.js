import express from "express";
const router = express.Router();
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Import controllers
import{
    createEmployee,
    updateEmployee,
    deleteEmployee,
    deleteMultipleEmployees,
    getEmployees,
    createEmployeeByManager
} from "../controller/employee.controller.js"
import { authenticateUser } from "../utils/middlewere.js";

// Multer config
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "../upload");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

// All specific routes must come before parameterized routes (/:id)
// This prevents Express from matching "bulk-delete" as an ID parameter

// Get all employees
router.get("/all", authenticateUser, getEmployees)

// Manager-specific employee creation
router.post("/manager", authenticateUser, upload.single("image"), createEmployeeByManager)

// Bulk delete - must be before /:id route
router.delete("/bulk-delete", authenticateUser, deleteMultipleEmployees)

// Create employee (with optional image)
router.post("/", authenticateUser, upload.single("image"), createEmployee);

// Update employee (with optional image) - parameterized route
router.put("/:id", authenticateUser, upload.single("image"), updateEmployee);

// Delete single employee - parameterized route (must be last)
router.delete("/:id", authenticateUser, deleteEmployee)

export default router;