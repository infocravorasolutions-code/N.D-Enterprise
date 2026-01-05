import Site from "../models/site.models.js";
import Employee from "../models/employee.models.js";
import Manager from "../models/manager.models.js";
import Attendance from "../models/attendence.models.js";
import mongoose from "mongoose";

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

    const sites = await Site.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ message: "Success", data: sites });
  } catch (error) {
    console.error("Error fetching sites:", error);
    res.status(500).json({ message: "Error fetching sites", error: error.message });
  }
};

// Get a single site by ID
export const getSiteById = async (req, res) => {
  try {
    const site = await Site.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!site) {
      return res.status(404).json({ message: "Site not found" });
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
    const { name, location, description, startDate, endDate, status } = req.body;

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ message: "Start date must be before end date" });
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

    if (!updatedSite) {
      return res.status(404).json({ message: "Site not found" });
    }

    res.status(200).json({ message: "Site updated successfully", site: updatedSite });
  } catch (error) {
    console.error("Error updating site:", error);
    res.status(500).json({ message: "Error updating site", error: error.message });
  }
};

// Delete a site (soft delete by setting isActive to false)
export const deleteSite = async (req, res) => {
  try {
    const site = await Site.findByIdAndUpdate(
      req.params.id,
      { isActive: false, status: 'cancelled' },
      { new: true }
    );

    if (!site) {
      return res.status(404).json({ message: "Site not found" });
    }

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
    
    // Convert siteId string to ObjectId
    const siteObjectId = new mongoose.Types.ObjectId(siteId);

    const site = await Site.findById(siteId);
    if (!site) {
      return res.status(404).json({ message: "Site not found" });
    }

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
    const { isWorking, shift } = req.query;

    // Convert siteId string to ObjectId
    const siteObjectId = new mongoose.Types.ObjectId(siteId);

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
    const { startDate, endDate, shift, employeeId } = req.query;
    
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

