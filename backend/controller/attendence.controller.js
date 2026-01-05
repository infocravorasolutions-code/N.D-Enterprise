import Attendance from "../models/attendence.models.js";
import Employee from "../models/employee.models.js";
import Admin from "../models/admin.models.js";
import mongoose from "mongoose";
import { getCurrentISTTime, getHoursAgoInIST, formatAttendanceForAPI } from "../utils/timeUtils.js";



// Default shift configurations
const DEFAULT_SHIFT_TIMES = {
  morning: { 
    stepIn: "07:00", 
    stepOut: "15:00", // 3:00 PM
    label: "7 AM - 3 PM (Morning)"
  },
  evening: { 
    stepIn: "15:00", // 3:00 PM
    stepOut: "23:00", // 11:00 PM
    label: "3 PM - 11 PM (Evening)"
  },
  night: { 
    stepIn: "23:00", // 11:00 PM
    stepOut: "07:00", // 7:00 AM (next day)
    label: "11 PM - 7 AM (Night)"
  }
};

// Function to auto-detect shift based on clock-in time
const getShiftFromTime = (clockInTime) => {
  const hour = clockInTime.getHours();
  
  if (hour >= 7 && hour < 15) { // 7:00 AM to 2:59 PM
    return 'morning';
  } else if (hour >= 15 && hour < 23) { // 3:00 PM to 10:59 PM
    return 'evening';
  } else { // 11:00 PM to 6:59 AM
    return 'night';
  }
};

// Function to get shift end time based on shift type
const getShiftEndTime = (clockInTime, shift) => {
  const clockInDate = new Date(clockInTime);
  const year = clockInDate.getFullYear();
  const month = clockInDate.getMonth();
  const date = clockInDate.getDate();
  
  switch (shift) {
    case 'morning':
      // Morning shift ends at 3:00 PM same day
      return new Date(year, month, date, 15, 0, 0);
    case 'evening':
      // Evening shift ends at 11:00 PM same day
      return new Date(year, month, date, 23, 0, 0);
    case 'night':
      // Night shift ends at 7:00 AM next day
      return new Date(year, month, date + 1, 7, 0, 0);
    default:
      // Default to 8 hours from clock-in
      return new Date(clockInTime.getTime() + 8 * 60 * 60 * 1000);
  }
};


// Mark step in
export const markStepIn = async (req, res) => {
  try {
    // console.log("[DEBUG] markStepIn request body:", req.body);
    const { employeeId, managerId, longitude, latitude, address, note, shift, siteId } = req.body;

    // Check if there is already an open attendance for this employee
    const openAttendance = await Attendance.findOne({ employeeId, stepOut: { $exists: false } });
    if (openAttendance) {
      return res.status(400).json({ message: "Already stepped in. Please step out before stepping in again." });
    }

    // Handle siteId - convert string "null" to actual null
    let finalSiteId = siteId;
    
    // Handle string "null", empty string, or falsy values
    if (finalSiteId === "null" || finalSiteId === "" || finalSiteId === null || finalSiteId === undefined) {
      finalSiteId = null;
    } else {
      // Try to convert to ObjectId if it's a valid string
      try {
        finalSiteId = new mongoose.Types.ObjectId(finalSiteId);
      } catch (e) {
        console.log(`[markStepIn] Invalid siteId format: ${finalSiteId}, setting to null`);
        finalSiteId = null;
      }
    }
    
    // If still no siteId, try to get it from employee
    if (!finalSiteId) {
      const employee = await Employee.findById(employeeId);
      if (employee && employee.siteId) {
        finalSiteId = employee.siteId;
      }
    }

    const stepIn = getCurrentISTTime();
    const stepInImage = req.file ? req.file.filename : null;
    
    // Use shift from request body if provided, otherwise auto-detect based on clock-in time
    const finalShift = shift || getShiftFromTime(stepIn);
    console.log(`Using shift: ${finalShift} (${shift ? 'from request' : 'auto-detected'}) for clock-in time: ${stepIn.toLocaleString()}`);

    const attendance = new Attendance({
      employeeId,
      managerId,
      stepIn,
      stepInImage,
      stepInLongitude: longitude,
      stepInLatitude: latitude,
      stepInAddress: address,
      // Keep legacy fields for backward compatibility
      longitude,
      latitude,
      address,
      note,
      shift: finalShift, // Use shift from request or auto-detected
      siteId: finalSiteId || null
    });

    await attendance.save();
    await Employee.findByIdAndUpdate(employeeId, { isWorking: true });
    
    console.log(`[markStepIn] Created attendance with siteId: ${finalSiteId || 'null'} for employee: ${employeeId}`);
    
    res.status(201).json({ 
      message: "Step In marked", 
      attendance: formatAttendanceForAPI(attendance),
      detectedShift: finalShift,
      shiftEndTime: getShiftEndTime(stepIn, finalShift)
    });
  } catch (error) {
    console.error("Error marking step in:", error);
    res.status(500).json({ message: "Error marking step in", error });
  }
};

export const updateAttendance = async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const { 
      longitude, 
      latitude, 
      address, 
      note, 
      stepOut,
      stepOutImage,
      totalTime,
      employeeId,
      managerId,
      stepIn,
      shift,
      // Step-specific location fields
      stepInLongitude,
      stepInLatitude,
      stepInAddress,
      stepOutLongitude,
      stepOutLatitude,
      stepOutAddress,
    } = req.body;

    // Find the attendance record
    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    // Prepare update data
    const updateData = {};
    
    // Legacy location fields (for backward compatibility)
    if (longitude !== undefined) updateData.longitude = longitude;
    if (latitude !== undefined) updateData.latitude = latitude;
    if (address !== undefined) updateData.address = address;
    
    // Step-specific location fields
    if (stepInLongitude !== undefined) updateData.stepInLongitude = stepInLongitude;
    if (stepInLatitude !== undefined) updateData.stepInLatitude = stepInLatitude;
    if (stepInAddress !== undefined) updateData.stepInAddress = stepInAddress;
    if (stepOutLongitude !== undefined) updateData.stepOutLongitude = stepOutLongitude;
    if (stepOutLatitude !== undefined) updateData.stepOutLatitude = stepOutLatitude;
    if (stepOutAddress !== undefined) updateData.stepOutAddress = stepOutAddress;
    
    if (note !== undefined) updateData.note = note;
    if (employeeId !== undefined) updateData.employeeId = employeeId;
    if (managerId !== undefined) updateData.managerId = managerId;
    if (stepIn !== undefined) updateData.stepIn = new Date(stepIn);
    if (shift !== undefined) updateData.shift = shift;

    // Handle stepOut update
    if (stepOut !== undefined) {
      updateData.stepOut = new Date(stepOut);
      
      // Update employee working status when stepping out
      if (attendance.employeeId) {
        await Employee.findByIdAndUpdate(attendance.employeeId, { isWorking: false });
      }
    }

    // Calculate totalTime if both stepIn and stepOut are provided (or updated)
    // Use the new values from updateData if available, otherwise use existing values from attendance
    const finalStepIn = updateData.stepIn || attendance.stepIn;
    const finalStepOut = updateData.stepOut !== undefined ? updateData.stepOut : attendance.stepOut;
    
    // If stepOut is being cleared (set to null), also clear totalTime
    if (stepOut === null) {
      updateData.totalTime = null;
      console.log('stepOut cleared, totalTime set to null');
    }
    // Only calculate totalTime if both stepIn and stepOut exist and totalTime wasn't explicitly provided
    else if (totalTime === undefined && finalStepIn && finalStepOut) {
      const stepInTime = new Date(finalStepIn);
      const stepOutTime = new Date(finalStepOut);
      updateData.totalTime = Math.floor((stepOutTime - stepInTime) / (1000 * 60)); // in minutes
      console.log(`Calculated totalTime: ${updateData.totalTime} minutes from stepIn: ${stepInTime.toISOString()} to stepOut: ${stepOutTime.toISOString()}`);
    } else if (totalTime !== undefined) {
      // If totalTime is explicitly provided, use it
      updateData.totalTime = totalTime;
    }

    // Handle image updates
    if (req.file) {
      // Determine which image to update based on field name or current state
      if (req.file.fieldname === 'stepOutImage' || stepOut !== undefined) {
        updateData.stepOutImage = req.file.filename;
      } else {
        updateData.stepInImage = req.file.filename;
      }
    }

    // Handle stepOutImage as string (if passed in body)
    if (stepOutImage !== undefined) {
      updateData.stepOutImage = stepOutImage;
    }

    // Update the attendance record
    const updatedAttendance = await Attendance.findByIdAndUpdate(
      attendanceId,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({ 
      message: "Attendance updated successfully", 
      attendance: updatedAttendance 
    });
  } catch (error) {
    console.error("Error updating attendance:", error);
    res.status(500).json({ message: "Error updating attendance", error });
  }
};


export const bulkUpdateAttendance = async (req, res) => {
  try {
    const { attendanceIds, stepIn, stepOut, shift, address } = req.body;

    console.log('Bulk update received:', { 
      attendanceIds: attendanceIds?.length, 
      stepIn, 
      stepOut, 
      shift,
      address,
      stepInType: typeof stepIn,
      stepOutType: typeof stepOut,
      stepInIsNull: stepIn === null,
      stepOutIsNull: stepOut === null
    });

    // Validate input
    if (!attendanceIds || !Array.isArray(attendanceIds)) {
      return res.status(400).json({ message: "attendanceIds must be an array" });
    }

    if (attendanceIds.length === 0) {
      return res.status(400).json({ message: "No attendance records selected" });
    }

    // Prepare update data
    const updateData = {};
    if (stepIn !== undefined) {
      updateData.stepIn = stepIn === null ? null : new Date(stepIn);
    }
    if (stepOut !== undefined) {
      updateData.stepOut = stepOut === null ? null : new Date(stepOut);
    }
    if (shift !== undefined) updateData.shift = shift;
    if (address !== undefined) updateData.address = address;

    console.log('Bulk update data to apply:', updateData);

    // If both stepIn and stepOut are provided and not null, calculate totalTime
    if (stepIn !== undefined && stepOut !== undefined && stepIn !== null && stepOut !== null) {
      const stepInTime = new Date(stepIn);
      const stepOutTime = new Date(stepOut);
      updateData.totalTime = Math.floor((stepOutTime - stepInTime) / (1000 * 60)); // in minutes
    } else if (stepOut === null) {
      // If stepOut is cleared, also clear totalTime
      updateData.totalTime = null;
    }

    // Update all selected attendance records
    const result = await Attendance.updateMany(
      { _id: { $in: attendanceIds } },
      updateData,
      { runValidators: true }
    );

    // Update employee working status if stepping out (and stepOut is not null)
    if (stepOut !== undefined && stepOut !== null) {
      // Get all affected employeeIds
      const attendances = await Attendance.find({ _id: { $in: attendanceIds } });
      const employeeIds = [...new Set(attendances.map(a => a.employeeId))];
      
      await Employee.updateMany(
        { _id: { $in: employeeIds } },
        { isWorking: false }
      );
    }

    res.status(200).json({
      message: `Successfully updated ${result.modifiedCount} attendance records`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error("Error bulk updating attendance:", error);
    res.status(500).json({ message: "Error bulk updating attendance", error });
  }
};


// Mark step out
export const markStepOut = async (req, res) => {
  try {
    if (!req.body || !req.body.attendanceId) {
      return res.status(400).json({ message: "attendanceId is required" });
    }
    const { attendanceId, longitude, latitude, address, note } = req.body;
    const stepOut = getCurrentISTTime();
    const stepOutImage = req.file ? req.file.filename : null; // Save only the filename

    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    const totalTime = Math.round((stepOut - attendance.stepIn) / 60000);

    attendance.stepOut = stepOut;
    attendance.stepOutImage = stepOutImage;
    attendance.stepOutLongitude = longitude;
    attendance.stepOutLatitude = latitude;
    attendance.stepOutAddress = address;
    // Keep legacy fields for backward compatibility
    attendance.longitude = longitude;
    attendance.latitude = latitude;
    attendance.address = address;
    attendance.totalTime = totalTime;
    attendance.note = note || attendance.note;

    await attendance.save();
     await Employee.findByIdAndUpdate(attendance.employeeId, { isWorking: false });
    
    res.status(200).json({ message: "Step Out marked", attendance: formatAttendanceForAPI(attendance) });
  } catch (error) {
    console.error("Error marking step out:", error);
    res.status(500).json({ message: "Error marking step out", error });
  }
};

// Get all attendance for an employee
export const getEmployeeAttendance = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const userData = req?.user;
    const mongoose = (await import("mongoose")).default;
    
    if (!employeeId) {
      return res.status(400).json({ message: "employeeId is required in params" });
    }
    
    // Build query
    let query = { employeeId };
    
    // For site managers, only show attendance for their site
    if (userData?.userType === 'manager' && userData?.siteId) {
      const siteObjectId = new mongoose.Types.ObjectId(userData.siteId);
      // Verify employee belongs to this site
      const employee = await Employee.findById(employeeId);
      if (employee && employee.siteId && String(employee.siteId) === String(siteObjectId)) {
        // Employee belongs to site, show their attendance (with or without siteId set)
        query.$or = [
          { siteId: siteObjectId },
          { siteId: null } // Legacy records
        ];
      } else {
        // Employee doesn't belong to this site, return empty
        return res.status(200).json({ attendance: [] });
      }
    } else if (userData?.userType === 'manager' && !userData?.siteId) {
      // Global manager: only show global attendance for their employees
      query.siteId = null;
      // Also verify employee belongs to this manager
      const employee = await Employee.findById(employeeId);
      if (employee && String(employee.managerId) !== String(userData.id)) {
        return res.status(200).json({ attendance: [] });
      }
    } else if (userData?.userType === 'admin') {
      // Admin: only show global attendance
      query.siteId = null;
    }
    
    const attendance = await Attendance.find(query)
      .populate("employeeId", "name email mobile image shift siteId")
      .populate("managerId", "name email mobile")
      .sort({ createdAt: -1 }); // Most recent first
    
    console.log(`[getEmployeeAttendance] Found ${attendance.length} records for employeeId: ${employeeId}, userType: ${userData?.userType}, siteId: ${userData?.siteId || 'null'}`);
    
    res.status(200).json({ attendance });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({ message: "Error fetching attendance", error });
  }
};

// Get all attendance records (for admin reports)
export const getAllAttendance = async (req, res) => {
  try {
    const { managerId, employeeId, startDate, endDate, order = 'desc' } = req.query;
    const userData = req?.user;
    const mongoose = (await import("mongoose")).default;
    
    // Build query object
    let query = {};
    
    // Handle site managers vs global managers/admins
    let attendance;
    
    if (userData?.userType === 'manager') {
      if (userData.siteId) {
        // Site manager: show attendance for ALL employees in their site
        const siteObjectId = new mongoose.Types.ObjectId(userData.siteId);
        
        // Get all employees for this site
        const siteEmployees = await Employee.find({ siteId: siteObjectId }).select('_id');
        const employeeIds = siteEmployees.map(emp => emp._id);
        
        console.log(`[getAllAttendance] Site manager - siteId: ${userData.siteId}, found ${employeeIds.length} employees`);
        
        if (employeeIds.length === 0) {
          console.log(`[getAllAttendance] Site manager has no employees in site ${userData.siteId}`);
          return res.status(200).json({ attendance: [] });
        }
        
        // Build base query for site employees
        const baseQuery = {
          employeeId: { $in: employeeIds }
        };
        
        // Add date filter if provided
        if (startDate || endDate) {
          baseQuery.stepIn = {};
          if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            baseQuery.stepIn.$gte = start;
          }
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            baseQuery.stepIn.$lte = end;
          }
        }
        
        // Filter by employee if specified
        if (employeeId) {
          // Verify employee belongs to this site
          const employee = await Employee.findById(employeeId);
          if (employee && employee.siteId && String(employee.siteId) === String(siteObjectId)) {
            baseQuery.employeeId = employeeId;
          } else {
            // Employee doesn't belong to this site, return empty
            console.log(`[getAllAttendance] Employee ${employeeId} doesn't belong to site ${userData.siteId}`);
            return res.status(200).json({ attendance: [] });
          }
        }
        
        // Build sort object
        const sort = {};
        if (order === 'desc') {
          sort.createdAt = -1;
        } else {
          sort.createdAt = 1;
        }
        
        console.log(`[getAllAttendance] Site manager query:`, JSON.stringify(baseQuery, null, 2));
        
        attendance = await Attendance.find(baseQuery)
          .populate("employeeId", "name email mobile image shift siteId")
          .populate("managerId", "name email mobile")
          .sort(sort);
          
        console.log(`[getAllAttendance] Site manager found ${attendance.length} attendance records`);
      } else {
        // Global manager: show global attendance for their employees
        query.siteId = null;
        query.managerId = userData.id;
        
        // Filter by date range
        if (startDate || endDate) {
          query.stepIn = {};
          if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            query.stepIn.$gte = start;
          }
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query.stepIn.$lte = end;
          }
        }
        
        // Filter by employee
        if (employeeId) {
          query.employeeId = employeeId;
        }
        
        // Build sort object
        const sort = {};
        if (order === 'desc') {
          sort.createdAt = -1;
        } else {
          sort.createdAt = 1;
        }
        
        attendance = await Attendance.find(query)
          .populate("employeeId", "name email mobile image shift siteId")
          .populate("managerId", "name email mobile")
          .sort(sort);
      }
    } else {
      // Admin: show only global attendance
      query.siteId = null;
      
      // Filter by manager (if provided in query)
    if (managerId) {
      query.managerId = managerId;
    }
    
    // Filter by employee
    if (employeeId) {
      query.employeeId = employeeId;
    }
    
    // Filter by date range
    if (startDate || endDate) {
      query.stepIn = {};
      if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          query.stepIn.$gte = start;
      }
      if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          query.stepIn.$lte = end;
      }
    }
    
    // Build sort object
    const sort = {};
    if (order === 'desc') {
      sort.createdAt = -1;
    } else {
      sort.createdAt = 1;
    }
    
      attendance = await Attendance.find(query)
        .populate("employeeId", "name email mobile image shift siteId")
        .populate("managerId", "name email mobile")
      .sort(sort);
    }
    
    console.log(`[getAllAttendance] Final result: ${attendance.length} attendance records for userType: ${userData?.userType}, siteId: ${userData?.siteId || 'null'}`);
      
    res.status(200).json({ attendance });
  } catch (error) {
    console.error("Error fetching all attendance:", error);
    res.status(500).json({ message: "Error fetching all attendance", error });
  }
};

// Bulk step-in for all employees (Admin only - mohit123456rathod@gmail.com)
export const bulkStepIn = async (req, res) => {
  try {
    // Check if the request is from the authorized admin
    const adminEmail = req.body.adminEmail || req.headers['admin-email'];
    
    if (adminEmail !== 'mohit123456rathod@gmail.com') {
      return res.status(403).json({ 
        message: "Access denied. Only authorized admin can perform bulk step-in." 
      });
    }

    // Get admin details
    const admin = await Admin.findOne({ email: adminEmail });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const { shift, longitude, latitude, address, note } = req.body;
    const stepInImage = req.file ? req.file.filename : null;

    if (!shift) {
      return res.status(400).json({ message: "Shift is required" });
    }

    // Validate shift
    if (!['morning', 'evening', 'night'].includes(shift)) {
      return res.status(400).json({ message: "Invalid shift. Must be morning, evening, or night" });
    }

    const stepIn = getCurrentISTTime();
    
    // Get all global employees for this shift (exclude site-specific employees)
    const employees = await Employee.find({ 
      shift: shift,
      isWorking: false, // Only employees who are not currently working
      siteId: null // Only global employees (not assigned to any site)
    });

    if (employees.length === 0) {
      return res.status(404).json({ message: "No available employees found for bulk step-in" });
    }

    const results = {
      success: [],
      failed: [],
      alreadyWorking: []
    };

    // Process each employee
    for (const employee of employees) {
      try {
        // Check if employee is already clocked in
        const existingAttendance = await Attendance.findOne({ 
          employeeId: employee._id, 
          stepOut: { $exists: false } 
        });

        if (existingAttendance) {
          results.alreadyWorking.push({
            employeeId: employee._id,
            employeeName: employee.name,
            reason: "Already clocked in"
          });
          continue;
        }

        // Create attendance record
        const attendance = new Attendance({
          employeeId: employee._id,
          managerId: admin._id, // Use admin as manager for bulk operations
          stepIn,
          stepInImage, // Use admin's step-in image for all employees
          stepInLongitude: longitude || 0,
          stepInLatitude: latitude || 0,
          stepInAddress: address || 'Bulk step-in location',
          // Keep legacy fields for backward compatibility
          longitude: longitude || 0,
          latitude: latitude || 0,
          address: address || 'Bulk step-in location',
          note: note || `Bulk step-in by admin ${admin.name}`,
          shift
        });

        await attendance.save();
        
        // Update employee status
        await Employee.findByIdAndUpdate(employee._id, { isWorking: true });

        results.success.push({
          employeeId: employee._id,
          employeeName: employee.name,
          attendanceId: attendance._id,
          stepIn: formatAttendanceForAPI(attendance).stepIn
        });

      } catch (error) {
        console.error(`Error processing employee ${employee.name}:`, error);
        results.failed.push({
          employeeId: employee._id,
          employeeName: employee.name,
          error: error.message
        });
      }
    }

    console.log(`Bulk step-in completed by admin ${admin.name}:`);
    console.log(`- Success: ${results.success.length}`);
    console.log(`- Failed: ${results.failed.length}`);
    console.log(`- Already working: ${results.alreadyWorking.length}`);

    res.status(200).json({
      message: "Bulk step-in completed",
      results,
      summary: {
        totalEmployees: employees.length,
        successful: results.success.length,
        failed: results.failed.length,
        alreadyWorking: results.alreadyWorking.length
      }
    });

  } catch (error) {
    console.error("Error in bulk step-in:", error);
    res.status(500).json({ message: "Error in bulk step-in", error: error.message });
  }
};

// Delete attendance record
export const deleteAttendance = async (req, res) => {
  try {
    const { attendanceId } = req.params;
    
    console.log('Delete attendance request for ID:', attendanceId);

    // Find the attendance record
    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    // Get employee ID for updating working status
    const employeeId = attendance.employeeId;

    // Delete the attendance record
    await Attendance.findByIdAndDelete(attendanceId);

    // Update employee working status if they were working
    if (attendance.stepOut === null || attendance.stepOut === undefined) {
      // Employee was still working, set to not working
      await Employee.findByIdAndUpdate(employeeId, { isWorking: false });
      console.log(`Updated employee ${employeeId} working status to false`);
    }

    console.log(`Successfully deleted attendance record ${attendanceId}`);

    res.status(200).json({ 
      message: "Attendance record deleted successfully",
      deletedId: attendanceId
    });

  } catch (error) {
    console.error("Error deleting attendance:", error);
    res.status(500).json({ message: "Error deleting attendance", error: error.message });
  }
};

// Get attendance summary (count of present employees by date and shift)
export const getAttendanceSummary = async (req, res) => {
  try {
    const { date, shift } = req.query;
    
    // Validate required parameters
    if (!date || !shift) {
      return res.status(400).json({ 
        message: "Date and shift are required",
        error: "Missing required parameters"
      });
    }

    // Validate shift
    if (!['morning', 'evening', 'night'].includes(shift)) {
      return res.status(400).json({ 
        message: "Invalid shift. Must be morning, evening, or night",
        error: "Invalid shift value"
      });
    }

    // Parse the date
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ 
        message: "Invalid date format",
        error: "Date parsing failed"
      });
    }

    // Set date range for the target date (start of day to end of day)
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const userData = req?.user;
    const mongoose = (await import("mongoose")).default;
    
    // Build employee and attendance match based on user type
    let employeeMatch = { shift: shift };
    let attendanceMatch = {
      shift: shift,
      stepIn: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    };
    
    if (userData?.userType === 'manager') {
      if (userData.siteId) {
        // Site manager: show data for their site
        const siteObjectId = new mongoose.Types.ObjectId(userData.siteId);
        employeeMatch.siteId = siteObjectId;
        employeeMatch.managerId = userData.id;
        attendanceMatch.siteId = siteObjectId;
        attendanceMatch.managerId = userData.id;
      } else {
        // Global manager: show global data
        employeeMatch.siteId = null;
        employeeMatch.managerId = userData.id;
        attendanceMatch.siteId = null;
        attendanceMatch.managerId = userData.id;
      }
    } else {
      // Admin: show only global data
      employeeMatch.siteId = null;
      attendanceMatch.siteId = null;
    }

    // Get total employees for this shift
    const totalEmployees = await Employee.countDocuments(employeeMatch);

    // Get present employees (optimized query with projection)
    // Count distinct employees who have stepIn on this date with this shift
    // Using aggregation for better performance on large datasets
    const presentEmployees = await Attendance.aggregate([
      {
        $match: attendanceMatch
      },
      {
        $group: {
          _id: "$employeeId"
        }
      }
    ]);

    const presentCount = presentEmployees.length;

    res.status(200).json({
      date: date,
      shift: shift,
      totalEmployees: totalEmployees,
      presentEmployees: presentCount,
      summary: `${presentCount}P/${totalEmployees}`
    });

  } catch (error) {
    console.error("Error fetching attendance summary:", error);
    res.status(500).json({ 
      message: "Error fetching attendance summary", 
      error: error.message 
    });
  }
};
