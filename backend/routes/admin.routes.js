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

// Define routes
router.post("/", createAdmin);
router.post("/login", loginAdmin); 
router.get("/all", authenticateUser,getAllAdmins);
router.get("/:id",authenticateUser, getAdminById);
router.put("/:id",authenticateUser, updateAdmin);
router.delete("/:id",authenticateUser, deleteAdmin);








export default router;
