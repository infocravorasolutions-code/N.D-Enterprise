import express from "express";
const router = express.Router();

import {
  createSite,
  getAllSites,
  getSiteById,
  updateSite,
  deleteSite,
  getSiteStats,
  getSiteEmployees,
  getSiteManagers,
  getSiteAttendance
} from "../controller/site.controller.js";
import { authenticateUser } from "../utils/middlewere.js";

// All routes require authentication
router.use(authenticateUser);

// Site CRUD operations
router.post("/", createSite);
router.get("/all", getAllSites);
router.get("/:id", getSiteById);
router.put("/:id", updateSite);
router.delete("/:id", deleteSite);

// Site statistics and reports
router.get("/:id/stats", getSiteStats);
router.get("/:id/employees", getSiteEmployees);
router.get("/:id/managers", getSiteManagers);
router.get("/:id/attendance", getSiteAttendance);

export default router;

