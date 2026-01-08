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
  getSiteAttendance,
  assignEmployeesToSite,
  unassignEmployeesFromSite,
  reassignEmployeesToSite
} from "../controller/site.controller.js";
import { authenticateUser } from "../utils/middlewere.js";

// All routes require authentication
router.use(authenticateUser);

// Debug: Log route registration
console.log('[SITE ROUTES] Registering site routes...');

// Site CRUD operations
router.post("/", createSite);
router.get("/all", getAllSites);

// IMPORTANT: More specific routes must come BEFORE generic /:id route
// Site statistics and reports
router.get("/:id/stats", getSiteStats);
router.get("/:id/employees", getSiteEmployees);
router.get("/:id/managers", getSiteManagers);
router.get("/:id/attendance", getSiteAttendance);

// Bulk assign employees to site (must be before /:id)
// Using explicit POST method to ensure it matches correctly
router.post("/:id/assign-employees", async (req, res) => {
  console.log('[ROUTE] POST /:id/assign-employees hit!', req.params.id);
  return assignEmployeesToSite(req, res);
});

// Unassign employees from site (must be before /:id)
router.post("/:id/unassign-employees", async (req, res) => {
  console.log('[ROUTE] POST /:id/unassign-employees hit!', req.params.id);
  return unassignEmployeesFromSite(req, res);
});

// Reassign employees to different site (standalone route, not site-specific)
router.post("/reassign-employees", async (req, res) => {
  console.log('[ROUTE] POST /reassign-employees hit!');
  return reassignEmployeesToSite(req, res);
});

// Generic routes (must come last)
router.get("/:id", getSiteById);
router.put("/:id", updateSite);
router.delete("/:id", deleteSite);

export default router;

