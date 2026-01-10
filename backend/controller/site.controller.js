import Site from "../models/site.models.js";
import Employee from "../models/employee.models.js";
import Manager from "../models/manager.models.js";
import Attendance from "../models/attendence.models.js";
import mongoose from "mongoose";

/**
 * Helper function to check if admin has permission to access a site
 * - Superadmins can only access sites they created
 * - Readonly admins can only access their assigned site (if siteId matches)
 */
const checkAdminSitePermission = async (siteId, adminId, adminRole, adminSiteId) => {
  if (!adminId) return { allowed: false, site: null };
  
  const site = await Site.findById(siteId);
  if (!site) {
    return { allowed: false, site: null, error: "Site not found" };
  }

  // Readonly admin - can only access their assigned site
  if (adminRole === 'readonly' && adminSiteId) {
    if (String(site._id) !== String(adminSiteId)) {
      return { allowed: false, site, error: "You don't have permission to access this site" };
    }
    return { allowed: true, site };
  }

  // Superadmin - can only access sites they created
  const siteCreatedBy = site.createdBy;
  if (String(siteCreatedBy) !== String(adminId)) {
    return { allowed: false, site, error: "You don't have permission to access this site" };
  }

  return { allowed: true, site };
};

// Create a new site
export const createSite = async (req, res) => {
  try {
    const { name, location, description, startDate, endDate, status } = req.body;
    const userData = req?.user;

    if (!name || !location || !startDate || !endDate) {
      return res.status(400).json({ message: "Name, location, startDate, and endDate are required" });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ message: "Start date must be before end date" });
    }

    const newSite = new Site({
      name,
      location,
      description: description || "",
      startDate,
      endDate,
      status: status || 'active',
      createdBy: userData.id,
      isActive: true,
    });

    await newSite.save();
    res.status(201).json({ message: "Site created successfully", site: newSite });
  } catch (error) {
    console.error("Error creating site:", error);
    res.status(500).json({ message: "Error creating site", error: error.message });
  }
};

// Get all sites
export const getAllSites = async (req, res) => {
  try {
    const { status } = req.query;
    const userData = req?.user;

    let query = {};
    
    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    // Filter by admin: 
    // - Superadmins see sites they created
    // - Readonly admins see only their assigned site (if siteId is set)
    if (userData && userData.userType === 'admin') {
      if (userData.role === 'readonly' && userData.siteId) {
        // Readonly admin assigned to a site - only show that site
        query._id = userData.siteId;
        console.log(`[getAllSites] Readonly admin ${userData.id} - showing only assigned site ${userData.siteId}`);
      } else {
        // Superadmin - show sites they created
        query.createdBy = userData.id;
        console.log(`[getAllSites] Superadmin ${userData.id} - filtering sites by createdBy`);
      }
    }

    const sites = await Site.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    console.log(`[getAllSites] Found ${sites.length} sites for user ${userData?.id || 'unknown'}`);
    res.status(200).json({ message: "Success", data: sites });
  } catch (error) {
    console.error("Error fetching sites:", error);
    res.status(500).json({ message: "Error fetching sites", error: error.message });
  }
};

// Get a single site by ID
export const getSiteById = async (req, res) => {
  try {
    const userData = req?.user;
    const site = await Site.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!site) {
      return res.status(404).json({ message: "Site not found" });
    }

    // Check if admin can access this site
    if (userData && userData.userType === 'admin') {
      const permission = await checkAdminSitePermission(
        req.params.id, 
        userData.id, 
        userData.role, 
        userData.siteId
      );
      if (!permission.allowed) {
        return res.status(permission.error === "Site not found" ? 404 : 403).json({ 
          message: permission.error || "You don't have permission to access this site" 
        });
      }
    }

    res.status(200).json({ message: "Success", data: site });
  } catch (error) {
    console.error("Error fetching site:", error);
    res.status(500).json({ message: "Error fetching site", error: error.message });
  }
};

// Update a site
export const updateSite = async (req, res) => {
  try {
    const userData = req?.user;
    const { name, location, description, startDate, endDate, status } = req.body;

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ message: "Start date must be before end date" });
    }

    // First check if site exists and admin has permission
    const existingSite = await Site.findById(req.params.id);
    if (!existingSite) {
      return res.status(404).json({ message: "Site not found" });
    }

    // Check if admin can update this site
    if (userData && userData.userType === 'admin') {
      const permission = await checkAdminSitePermission(
        req.params.id, 
        userData.id, 
        userData.role, 
        userData.siteId
      );
      if (!permission.allowed) {
        return res.status(permission.error === "Site not found" ? 404 : 403).json({ 
          message: permission.error || "You don't have permission to update this site" 
        });
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (location) updateData.location = location;
    if (description !== undefined) updateData.description = description;
    if (startDate) updateData.startDate = startDate;
    if (endDate) updateData.endDate = endDate;
    if (status) updateData.status = status;

    const updatedSite = await Site.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('createdBy', 'name email');

    res.status(200).json({ message: "Site updated successfully", site: updatedSite });
  } catch (error) {
    console.error("Error updating site:", error);
    res.status(500).json({ message: "Error updating site", error: error.message });
  }
};

// Delete a site (soft delete by setting isActive to false)
export const deleteSite = async (req, res) => {
  try {
    const userData = req?.user;
    
    // First check if site exists and admin has permission
    const site = await Site.findById(req.params.id);
    if (!site) {
      return res.status(404).json({ message: "Site not found" });
    }

    // Check if admin can delete this site
    if (userData && userData.userType === 'admin') {
      const permission = await checkAdminSitePermission(
        req.params.id, 
        userData.id, 
        userData.role, 
        userData.siteId
      );
      if (!permission.allowed) {
        return res.status(permission.error === "Site not found" ? 404 : 403).json({ 
          message: permission.error || "You don't have permission to delete this site" 
        });
      }
    }

    const deletedSite = await Site.findByIdAndUpdate(
      req.params.id,
      { isActive: false, status: 'cancelled' },
      { new: true }
    );

    res.status(200).json({ message: "Site deleted successfully" });
  } catch (error) {
    console.error("Error deleting site:", error);
    res.status(500).json({ message: "Error deleting site", error: error.message });
  }
};

// Get site statistics and reports
export const getSiteStats = async (req, res) => {
  try {
    const siteId = req.params.id;
    const userData = req?.user;
    
    // Check admin permission and get site
    let site;
    if (userData && userData.userType === 'admin') {
      const permission = await checkAdminSitePermission(
        siteId, 
        userData.id, 
        userData.role, 
        userData.siteId
      );
      if (!permission.allowed) {
        return res.status(permission.error === "Site not found" ? 404 : 403).json({ 
          message: permission.error || "You don't have permission to access this site" 
        });
      }
      site = permission.site; // Get site from permission object
    } else {
      // For non-admin users, just check if site exists
      site = await Site.findById(siteId);
      if (!site) {
        return res.status(404).json({ message: "Site not found" });
      }
    }
    
    // Convert siteId string to ObjectId
    const siteObjectId = new mongoose.Types.ObjectId(siteId);

    // Count employees assigned to this site
    const totalEmployees = await Employee.countDocuments({ siteId: siteObjectId });
    
    // Count managers assigned to this site
    const totalManagers = await Manager.countDocuments({ siteId: siteObjectId });

    // Count working employees
    const workingEmployees = await Employee.countDocuments({ 
      siteId: siteObjectId,
      isWorking: true 
    });

    // Shift-wise employee count
    const shiftAggregation = await Employee.aggregate([
      { $match: { siteId: siteObjectId } },
      {
        $group: {
          _id: "$shift",
          count: { $sum: 1 }
        }
      }
    ]);

    const shiftWise = {};
    shiftAggregation.forEach(item => {
      shiftWise[item._id] = item.count;
    });

    // Attendance statistics
    const totalAttendanceRecords = await Attendance.countDocuments({ siteId: siteObjectId });
    
    // Get attendance records for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAttendance = await Attendance.countDocuments({
      siteId: siteObjectId,
      stepIn: { $gte: today, $lt: tomorrow }
    });

    // Get attendance by shift for today
    const todayShiftAttendance = await Attendance.aggregate([
      {
        $match: {
          siteId: siteObjectId,
          stepIn: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: "$shift",
          count: { $sum: 1 }
        }
      }
    ]);

    const todayShiftWise = {};
    todayShiftAttendance.forEach(item => {
      todayShiftWise[item._id] = item.count;
    });

    // Get date range attendance (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const last7DaysAttendance = await Attendance.aggregate([
      {
        $match: {
          siteId: siteObjectId,
          stepIn: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$stepIn" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      site: {
        _id: site._id,
        name: site.name,
        location: site.location,
        status: site.status,
        startDate: site.startDate,
        endDate: site.endDate,
      },
      statistics: {
        totalEmployees,
        totalManagers,
        workingEmployees,
        shiftWise,
        totalAttendanceRecords,
        todayAttendance,
        todayShiftWise,
        last7DaysAttendance: last7DaysAttendance.map(item => ({
          date: item._id,
          count: item.count
        }))
      }
    });
  } catch (error) {
    console.error("Error fetching site stats:", error);
    res.status(500).json({ message: "Error fetching site stats", error: error.message });
  }
};

// Get site employees
export const getSiteEmployees = async (req, res) => {
  try {
    const siteId = req.params.id;
    const userData = req?.user;
    const { isWorking, shift } = req.query;

    // Check admin permission
    if (userData && userData.userType === 'admin') {
      const permission = await checkAdminSitePermission(
        siteId, 
        userData.id, 
        userData.role, 
        userData.siteId
      );
      if (!permission.allowed) {
        return res.status(permission.error === "Site not found" ? 404 : 403).json({ 
          message: permission.error || "You don't have permission to access this site" 
        });
      }
    }

    // Convert siteId string to ObjectId
    const siteObjectId = new mongoose.Types.ObjectId(siteId);
    
    console.log(`[getSiteEmployees] Fetching employees for site: ${siteId}`);
    console.log(`[getSiteEmployees] Site ObjectId: ${siteObjectId}`);

    const pipeline = [
      { $match: { siteId: siteObjectId } }
    ];

    if (typeof isWorking !== "undefined") {
      pipeline.push({ $match: { isWorking: isWorking === 'true' } });
    }

    if (shift) {
      pipeline.push({ $match: { shift: shift } });
    }

    // Lookup for createdBy (Admin)
    pipeline.push({
      $lookup: {
        from: "admins",
        localField: "createdBy",
        foreignField: "_id",
        as: "createdBy"
      }
    });
    pipeline.push({
      $unwind: {
        path: "$createdBy",
        preserveNullAndEmptyArrays: true
      }
    });

    // Lookup for managerId (Manager)
    pipeline.push({
      $lookup: {
        from: "managers",
        localField: "managerId",
        foreignField: "_id",
        as: "managerId"
      }
    });
    pipeline.push({
      $unwind: {
        path: "$managerId",
        preserveNullAndEmptyArrays: true
      }
    });

    const employees = await Employee.aggregate(pipeline);
    console.log(`[getSiteEmployees] Found ${employees.length} employees for site ${siteId}`);
    res.status(200).json({ message: "Success", data: employees });
  } catch (error) {
    console.error("Error fetching site employees:", error);
    res.status(500).json({ message: "Error fetching site employees", error: error.message });
  }
};

// Get site managers
export const getSiteManagers = async (req, res) => {
  try {
    const siteId = req.params.id;
    const userData = req?.user;
    
    // Check admin permission
    if (userData && userData.userType === 'admin') {
      const permission = await checkAdminSitePermission(
        siteId, 
        userData.id, 
        userData.role, 
        userData.siteId
      );
      if (!permission.allowed) {
        return res.status(permission.error === "Site not found" ? 404 : 403).json({ 
          message: permission.error || "You don't have permission to access this site" 
        });
      }
    }
    
    // Convert siteId string to ObjectId
    const siteObjectId = new mongoose.Types.ObjectId(siteId);

    const managers = await Manager.find({ siteId: siteObjectId })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ message: "Success", data: managers });
  } catch (error) {
    console.error("Error fetching site managers:", error);
    res.status(500).json({ message: "Error fetching site managers", error: error.message });
  }
};

// Get site attendance records
export const getSiteAttendance = async (req, res) => {
  try {
    const siteId = req.params.id;
    const userData = req?.user;
    const { startDate, endDate, shift, employeeId } = req.query;
    
    // Check admin permission
    if (userData && userData.userType === 'admin') {
      const permission = await checkAdminSitePermission(
        siteId, 
        userData.id, 
        userData.role, 
        userData.siteId
      );
      if (!permission.allowed) {
        return res.status(permission.error === "Site not found" ? 404 : 403).json({ 
          message: permission.error || "You don't have permission to access this site" 
        });
      }
    }
    
    // Convert siteId string to ObjectId
    const siteObjectId = new mongoose.Types.ObjectId(siteId);

    const matchQuery = { siteId: siteObjectId };

    if (startDate || endDate) {
      matchQuery.stepIn = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        matchQuery.stepIn.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchQuery.stepIn.$lte = end;
      }
    }

    if (shift) {
      matchQuery.shift = shift;
    }

    if (employeeId) {
      matchQuery.employeeId = employeeId;
    }

    const attendance = await Attendance.find(matchQuery)
      .populate('employeeId', 'name email mobile image')
      .populate('managerId', 'name email mobile')
      .sort({ stepIn: -1 });

    res.status(200).json({ message: "Success", data: attendance });
  } catch (error) {
    console.error("Error fetching site attendance:", error);
    res.status(500).json({ message: "Error fetching site attendance", error: error.message });
  }
};

// Bulk assign employees to a site
export const assignEmployeesToSite = async (req, res) => {
  try {
    const siteId = req.params.id;
    const userData = req?.user;
    const { employeeIds } = req.body;

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ message: "Employee IDs array is required" });
    }

    // Check admin permission
    if (userData && userData.userType === 'admin') {
      const permission = await checkAdminSitePermission(siteId, userData.id);
      if (!permission.allowed) {
        return res.status(permission.error === "Site not found" ? 404 : 403).json({ 
          message: permission.error || "You don't have permission to assign employees to this site" 
        });
      }
    } else {
      // For non-admin users, just verify site exists
      const site = await Site.findById(siteId);
      if (!site) {
        return res.status(404).json({ message: "Site not found" });
      }
    }

    // Convert siteId to ObjectId
    const siteObjectId = new mongoose.Types.ObjectId(siteId);

    // Convert employee IDs to ObjectIds
    const employeeObjectIds = employeeIds.map(id => {
      try {
        return new mongoose.Types.ObjectId(id);
      } catch (err) {
        throw new Error(`Invalid employee ID: ${id}`);
      }
    });

    // Find managers assigned to this site
    const siteManagers = await Manager.find({ siteId: siteObjectId }).limit(1);
    console.log(`[assignEmployeesToSite] Found ${siteManagers.length} manager(s) for site ${siteId}`);
    
    // Determine which manager to assign employees to
    let managerIdToAssign = null;
    if (req.body.managerId) {
      // If managerId is explicitly provided in request, use it
      try {
        managerIdToAssign = new mongoose.Types.ObjectId(req.body.managerId);
        // Verify this manager is assigned to the site
        const manager = await Manager.findOne({ _id: managerIdToAssign, siteId: siteObjectId });
        if (!manager) {
          return res.status(400).json({ 
            message: "The specified manager is not assigned to this site" 
          });
        }
        console.log(`[assignEmployeesToSite] Using provided managerId: ${managerIdToAssign.toString()}, Manager name: ${manager.name}`);
      } catch (err) {
        return res.status(400).json({ message: "Invalid manager ID format" });
      }
    } else if (siteManagers.length > 0) {
      // If no managerId provided, use the first manager assigned to the site
      managerIdToAssign = siteManagers[0]._id;
      console.log(`[assignEmployeesToSite] Auto-selected first manager: ${managerIdToAssign.toString()}, Manager name: ${siteManagers[0].name}`);
    } else {
      // No managers assigned to site - return error
      return res.status(400).json({ 
        message: "No managers are assigned to this site. Please assign a manager to the site first, or specify a managerId in the request." 
      });
    }
    
    // Ensure managerIdToAssign is an ObjectId
    if (!(managerIdToAssign instanceof mongoose.Types.ObjectId)) {
      managerIdToAssign = new mongoose.Types.ObjectId(managerIdToAssign);
    }

    // Update employees to assign them to this site and update their manager
    const updateData = { 
      siteId: siteObjectId,
      managerId: managerIdToAssign
    };
    
    console.log(`[assignEmployeesToSite] Updating employees with:`, {
      siteId: siteObjectId.toString(),
      managerId: managerIdToAssign.toString(),
      employeeCount: employeeObjectIds.length
    });
    
    const result = await Employee.updateMany(
      { _id: { $in: employeeObjectIds } },
      { $set: updateData }
    );

    // Also update any existing attendance records for these employees to this site
    // This ensures their attendance history moves with them to the new site
    // Only update attendance records that are currently null (global) or from a different site
    const attendanceUpdateResult = await Attendance.updateMany(
      { 
        employeeId: { $in: employeeObjectIds },
        $or: [
          { siteId: null },
          { siteId: { $ne: siteObjectId } }
        ]
      },
      { $set: { siteId: siteObjectId } }
    );

    console.log(`[assignEmployeesToSite] Assigned ${result.modifiedCount} employees to site ${siteId}`);
    console.log(`[assignEmployeesToSite] Updated managerId to ${managerIdToAssign} for all assigned employees`);
    console.log(`[assignEmployeesToSite] Updated ${attendanceUpdateResult.modifiedCount} attendance records to site ${siteId}`);
    console.log(`[assignEmployeesToSite] Site ObjectId: ${siteObjectId}`);
    console.log(`[assignEmployeesToSite] Employee IDs: ${employeeObjectIds.length}`);

    // Verify the assignment by checking a few employees
    const sampleEmployees = await Employee.find({ 
      _id: { $in: employeeObjectIds.slice(0, 3) } 
    }).select('_id name managerId siteId');
    
    console.log(`[assignEmployeesToSite] Sample updated employees:`, 
      sampleEmployees.map(emp => ({
        id: emp._id.toString(),
        name: emp.name,
        managerId: emp.managerId?.toString(),
        siteId: emp.siteId?.toString()
      }))
    );

    // Verify the assignment
    const assignedEmployees = await Employee.countDocuments({ siteId: siteObjectId });
    console.log(`[assignEmployeesToSite] Total employees now assigned to site: ${assignedEmployees}`);

    res.status(200).json({
      message: `Successfully assigned ${result.modifiedCount} employee(s) to site and updated their manager`,
      assignedCount: result.modifiedCount,
      requestedCount: employeeIds.length,
      totalEmployeesInSite: assignedEmployees,
      managerId: managerIdToAssign
    });
  } catch (error) {
    console.error("Error assigning employees to site:", error);
    res.status(500).json({ 
      message: "Error assigning employees to site", 
      error: error.message 
    });
  }
};

// Unassign employees from a site (move them back to global/unassigned)
export const unassignEmployeesFromSite = async (req, res) => {
  try {
    const siteId = req.params.id;
    const userData = req?.user;
    const { employeeIds } = req.body;

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ message: "Employee IDs array is required" });
    }

    // Check admin permission
    if (userData && userData.userType === 'admin') {
      const permission = await checkAdminSitePermission(siteId, userData.id, userData.role, userData.siteId);
      if (!permission.allowed) {
        return res.status(permission.error === "Site not found" ? 404 : 403).json({ 
          message: permission.error || "You don't have permission to unassign employees from this site" 
        });
      }
    } else {
      // For non-admin users, just verify site exists
      const site = await Site.findById(siteId);
      if (!site) {
        return res.status(404).json({ message: "Site not found" });
      }
    }

    // Convert employee IDs to ObjectIds
    const employeeObjectIds = employeeIds.map(id => {
      try {
        return new mongoose.Types.ObjectId(id);
      } catch (err) {
        throw new Error(`Invalid employee ID: ${id}`);
      }
    });

    // Update employees to unassign them from this site (set siteId to null)
    const result = await Employee.updateMany(
      { _id: { $in: employeeObjectIds }, siteId: new mongoose.Types.ObjectId(siteId) },
      { $set: { siteId: null } }
    );

    // Also update attendance records for these employees to null (global/unassigned)
    // This ensures their attendance history moves with them when unassigned
    const attendanceUpdateResult = await Attendance.updateMany(
      { 
        employeeId: { $in: employeeObjectIds },
        siteId: new mongoose.Types.ObjectId(siteId)
      },
      { $set: { siteId: null } }
    );

    console.log(`[unassignEmployeesFromSite] Unassigned ${result.modifiedCount} employees from site ${siteId}`);
    console.log(`[unassignEmployeesFromSite] Updated ${attendanceUpdateResult.modifiedCount} attendance records to global (siteId: null)`);

    res.status(200).json({
      message: `Successfully unassigned ${result.modifiedCount} employee(s) from site`,
      unassignedCount: result.modifiedCount,
      requestedCount: employeeIds.length,
      attendanceRecordsUpdated: attendanceUpdateResult.modifiedCount
    });
  } catch (error) {
    console.error("Error unassigning employees from site:", error);
    res.status(500).json({ 
      message: "Error unassigning employees from site", 
      error: error.message 
    });
  }
};

// Reassign employees to a different site
export const reassignEmployeesToSite = async (req, res) => {
  try {
    const { employeeIds, targetSiteId } = req.body;

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ message: "Employee IDs array is required" });
    }

    if (!targetSiteId) {
      return res.status(400).json({ message: "Target site ID is required" });
    }

    const userData = req?.user;

    // Check admin permission for target site
    if (userData && userData.userType === 'admin') {
      const permission = await checkAdminSitePermission(targetSiteId, userData.id, userData.role, userData.siteId);
      if (!permission.allowed) {
        return res.status(permission.error === "Site not found" ? 404 : 403).json({ 
          message: permission.error || "You don't have permission to assign employees to this site" 
        });
      }
    } else {
      // For non-admin users, just verify target site exists
      const site = await Site.findById(targetSiteId);
      if (!site) {
        return res.status(404).json({ message: "Target site not found" });
      }
    }

    // Convert employee IDs and target site ID to ObjectIds
    const employeeObjectIds = employeeIds.map(id => {
      try {
        return new mongoose.Types.ObjectId(id);
      } catch (err) {
        throw new Error(`Invalid employee ID: ${id}`);
      }
    });

    const targetSiteObjectId = new mongoose.Types.ObjectId(targetSiteId);

    // Find managers assigned to the target site
    const targetSiteManagers = await Manager.find({ siteId: targetSiteObjectId }).limit(1);
    
    // Determine which manager to assign employees to
    let managerIdToAssign = null;
    if (req.body.managerId) {
      // If managerId is explicitly provided in request, use it
      try {
        managerIdToAssign = new mongoose.Types.ObjectId(req.body.managerId);
        // Verify this manager is assigned to the target site
        const manager = await Manager.findOne({ _id: managerIdToAssign, siteId: targetSiteObjectId });
        if (!manager) {
          return res.status(400).json({ 
            message: "The specified manager is not assigned to the target site" 
          });
        }
      } catch (err) {
        return res.status(400).json({ message: "Invalid manager ID format" });
      }
    } else if (targetSiteManagers.length > 0) {
      // If no managerId provided, use the first manager assigned to the target site
      managerIdToAssign = targetSiteManagers[0]._id;
    } else {
      // No managers assigned to target site - return error
      return res.status(400).json({ 
        message: "No managers are assigned to the target site. Please assign a manager to the site first, or specify a managerId in the request." 
      });
    }

    // Update employees to reassign them to the target site and update their manager
    const updateData = { 
      siteId: targetSiteObjectId,
      managerId: managerIdToAssign
    };
    
    const result = await Employee.updateMany(
      { _id: { $in: employeeObjectIds } },
      { $set: updateData }
    );

    // Also update attendance records for these employees to the new site
    // This ensures their attendance history moves with them to the new site
    const attendanceUpdateResult = await Attendance.updateMany(
      { employeeId: { $in: employeeObjectIds } },
      { $set: { siteId: targetSiteObjectId } }
    );

    console.log(`[reassignEmployeesToSite] Reassigned ${result.modifiedCount} employees to site ${targetSiteId}`);
    console.log(`[reassignEmployeesToSite] Updated managerId to ${managerIdToAssign} for all reassigned employees`);
    console.log(`[reassignEmployeesToSite] Updated ${attendanceUpdateResult.modifiedCount} attendance records to new site ${targetSiteId}`);

    res.status(200).json({
      message: `Successfully reassigned ${result.modifiedCount} employee(s) to site and updated their manager`,
      reassignedCount: result.modifiedCount,
      requestedCount: employeeIds.length,
      targetSiteId: targetSiteId,
      managerId: managerIdToAssign
    });
  } catch (error) {
    console.error("Error reassigning employees to site:", error);
    res.status(500).json({ 
      message: "Error reassigning employees to site", 
      error: error.message 
    });
  }
};

