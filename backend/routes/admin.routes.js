import express from "express";
const router = express.Router();



// Import controllers
import { 
  createAdmin, 
  loginAdmin, 
  getAllAdmins, 
  getAdminById, 
  updateAdmin, 
  deleteAdmin 
} from "../controller/admin.controller.js";    
import { authenticateUser } from "../utils/middlewere.js";
import { autoStepIn, autoStepOut } from "../controller/cron.controller.js";

// Define routes
router.post("/", createAdmin);
router.post("/login", loginAdmin); 
router.get("/all", authenticateUser,getAllAdmins);
router.get("/:id",authenticateUser, getAdminById);
router.put("/:id",authenticateUser, updateAdmin);
router.delete("/:id",authenticateUser, deleteAdmin);

router.post("/cron/trigger-step-in", authenticateUser, async (req, res) => {
  const { shift, hour } = req.body;
  try {
    await autoStepIn(shift, hour);
    res.status(200).json({ message: "Auto step-in triggered successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error triggering auto step-in", error: error.message });
  }
});

router.post("/cron/trigger-step-out", authenticateUser, async (req, res) => {
  try {
    await autoStepOut();
    res.status(200).json({ message: "Auto step-out triggered successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error triggering auto step-out", error: error.message });
  }
});








export default router;
