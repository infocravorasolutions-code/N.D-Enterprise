import express from "express";
const router = express.Router();
// Import controllers
import {
    createManager,
    getManager,
    updateManager,
    deleteManager,
    getAllManagers,
    loginManager
} from "../controller/manager.controller.js";   
import { authenticateUser } from "../utils/middlewere.js";
// Define routes
router.post("/",authenticateUser,createManager);    
router.post("/login",loginManager)
router.get("/all",authenticateUser,getAllManagers);
router.get("/:id",authenticateUser, getManager);
router.put("/:id", authenticateUser,updateManager);  
router.delete("/:id", authenticateUser,deleteManager);

export default router;