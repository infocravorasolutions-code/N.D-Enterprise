import Employee from "../models/employee.models.js";
import Manager from "../models/manager.models.js";
import mongoose from "mongoose";

// Controller: createEmployee
// export const createEmployee = async (req, res) => {
//     try {
//         const { email, name, mobile, address, managerId, shift, createdBy, isCreatedByAdmin } = req.body;
//         // Log the incoming payload and clarify optional fields
//         console.log('[CREATE EMPLOYEE] Payload:', req.body);
//         console.log('[CREATE EMPLOYEE] Email and mobile are optional. Received email:', email, 'mobile:', mobile);
//         // Validate required fields
//         if (!name || !address || !managerId || !shift || isCreatedByAdmin === undefined || createdBy === undefined) {
//             return res.status(400).json({ message: "All fields are required" });
//         }
//         const newEmployee = new Employee({ email, name, mobile, address, managerId, shift, createdBy, isCreatedByAdmin });
//         await newEmployee.save();
//         res.status(201).json({ message: "Employee created successfully", employee: newEmployee });
//     } catch (error) {
//         if (error.code === 11000) {
//             return res.status(400).json({ message: "Email already exists" });
//         }
//         console.error("Error creating employee:", error);
//         res.status(500).json({ message: "Error creating employee", error });
//     }
// };

export const createEmployee = async (req, res) => {
  try {
    const { email, name, mobile, address, managerId, shift, createdBy, isCreatedByAdmin, siteId, autoPunchEnabled } = req.body;

    console.log('[CREATE EMPLOYEE] Payload:', req.body);

    if (!name || !address || !managerId || !shift || isCreatedByAdmin === undefined || createdBy === undefined) {
      return res.status(400).json({ message: "All fields are required" });
    }

    let image = "";
    if (req.file) {
      image = req.file.filename;
    }

    const finalSiteId = siteId && siteId !== 'null' && siteId !== '' ? siteId : null;
    const defaultAutoPunch = finalSiteId ? true : false;
    const finalAutoPunch = typeof autoPunchEnabled !== 'undefined' && autoPunchEnabled !== null
      ? Boolean(autoPunchEnabled)
      : defaultAutoPunch;

    const newEmployee = new Employee({
      email,
      name,
      mobile,
      address,
      managerId,
      shift,
      createdBy,
      isCreatedByAdmin,
      image,
      siteId: finalSiteId,
      autoPunchEnabled: finalAutoPunch
    });

    await newEmployee.save();
    res.status(201).json({ message: "Employee created successfully", employee: newEmployee });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Email already exists" });
    }
    console.error("Error creating employee:", error);
    res.status(500).json({ message: "Error creating employee", error });
  }
};

// export const updateEmployee = async (req, res) => {
//   try {
//     const updateData = { ...req.body };

//     const updatedEmployee = await Employee.findByIdAndUpdate(
//       req.params.id,
//       updateData,
//       { new: true }
//     );
//     if (!updatedEmployee) {
//       return res.status(404).json({ message: "Employee not found" });
//     }
//     res.status(200).json({ message: "Employee updated successfully", employee: updatedEmployee });
//   } catch (error) {
//     console.error("Error updating employee:", error);
//     res.status(500).json({ message: "Error updating employee", error });
//   }
// }

export const updateEmployee = async (req, res) => {
  try {
    const updateData = { ...req.body };

    if (req.file) {
      updateData.image = req.file.filename; // or full URL if needed
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedEmployee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.status(200).json({ message: "Employee updated successfully", employee: updatedEmployee });
  } catch (error) {
    console.error("Error updating employee:", error);
    res.status(500).json({ message: "Error updating employee", error });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    // Safety check: reject if somehow "bulk-delete" was matched as an ID
    if (req.params.id === 'bulk-delete' || req.params.id === 'bulk/delete') {
      console.error('[DELETE EMPLOYEE] Invalid route match - bulk-delete was matched as ID');
      return res.status(404).json({ message: "Route not found" });
    }
    
    const deletedEmployee = await Employee.findByIdAndDelete(req.params.id);
    if (!deletedEmployee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.status(200).json({ message: "Employee deleted successfully" });
  } catch (error) {
    console.error("Error deleting employee:", error);
    res.status(500).json({ message: "Error deleting employee", error });
  }
}

export const deleteMultipleEmployees = async (req, res) => {
  try {
    console.log('[BULK DELETE] Request received:', req.body);
    const { employeeIds } = req.body;
    
    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      console.log('[BULK DELETE] Validation failed: employeeIds is missing or empty');
      return res.status(400).json({ message: "Employee IDs array is required" });
    }

    console.log(`[BULK DELETE] Attempting to delete ${employeeIds.length} employees`);

    // Convert string IDs to MongoDB ObjectIds
    const objectIds = employeeIds.map(id => {
      try {
        return new mongoose.Types.ObjectId(id);
      } catch (err) {
        console.error(`[BULK DELETE] Invalid ID format: ${id}`, err);
        throw new Error(`Invalid employee ID: ${id}`);
      }
    });

    console.log('[BULK DELETE] ObjectIds converted:', objectIds);

    const result = await Employee.deleteMany({ _id: { $in: objectIds } });
    
    console.log(`[BULK DELETE] Successfully deleted ${result.deletedCount} out of ${employeeIds.length} employees`);
    
    res.status(200).json({ 
      message: `Successfully deleted ${result.deletedCount} employee(s)`,
      deletedCount: result.deletedCount,
      requestedCount: employeeIds.length
    });
  } catch (error) {
    console.error("[BULK DELETE] Error deleting multiple employees:", error);
    res.status(500).json({ 
      message: "Error deleting employees", 
      error: error.message || String(error)
    });
  }
}
export const getEmployees = async (req, res) => {
  try {
    const { isWorking,shift } = req.query;
    const userData= req?.user
    console.log("userData---->",userData)

    // Build aggregation pipeline
    const pipeline = [];
    const mongoose = (await import("mongoose")).default;
    
    // Handle managers: if site manager (has siteId), show employees for that site; if global manager, show global employees
    if(userData && userData.userType=="manager"){
        // Ensure managerId is ObjectId
        const managerObjectId = userData.id instanceof mongoose.Types.ObjectId 
          ? userData.id 
          : new mongoose.Types.ObjectId(userData.id);
        
        if(userData.siteId) {
            // Site manager: show employees for their site
            const siteObjectId = new mongoose.Types.ObjectId(userData.siteId);
            pipeline.push({ $match: { managerId: managerObjectId, siteId: siteObjectId } });
            console.log(`[getEmployees] Site Manager - managerId: ${managerObjectId}, siteId: ${siteObjectId}`);
        } else {
            // Global manager: show global employees (siteId: null)
            pipeline.push({ $match: { managerId: managerObjectId, siteId: null } });
            console.log(`[getEmployees] Global Manager - managerId: ${managerObjectId}, siteId: null`);
        }
    } else if(userData && userData.userType=="admin") {
        // Admin filtering
        if (userData.role === 'readonly' && userData.siteId) {
            // Readonly admin assigned to a site - show only employees for that site
            const siteObjectId = new mongoose.Types.ObjectId(userData.siteId);
            pipeline.push({ $match: { siteId: siteObjectId } });
            console.log(`[getEmployees] Readonly Admin - showing employees for assigned site ${userData.siteId}`);
        } else {
            // Superadmin - show only global employees (siteId: null)
            pipeline.push({ $match: { siteId: null } });
            console.log(`[getEmployees] Superadmin - showing global employees (siteId: null)`);
        }
    } else {
        // No user data or unknown user type - return empty
        console.log(`[getEmployees] No valid user data`);
        return res.status(200).json({ message: "Success", data: [] });
    }

    // Filter by shift if isWorking param is provided
    if (typeof isWorking !== "undefined") {
        pipeline.push({ $match: { isWorking: isWorking } });
    }
 
    if(shift){
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

    const employees = await Employee.aggregate(pipeline.length ? pipeline : [{ $match: {} }]);
    console.log(`[getEmployees] Found ${employees.length} employees matching criteria`);
    res.status(200).json({ message: "Success", data: employees });
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ message: "Error fetching employees", error });
  }
}

// Manager-specific employee creation
export const createEmployeeByManager = async (req, res) => {
    try {
        const { email, name, mobile, address, shift, siteId } = req.body;
        const user = req.user;
        // Log the incoming payload and clarify optional fields
        console.log('[CREATE EMPLOYEE BY MANAGER] Payload:', req.body);
        console.log('[CREATE EMPLOYEE BY MANAGER] Email and mobile are optional. Received email:', email, 'mobile:', mobile);
        // Validate required fields
        if (!name || !address || !shift) {
            return res.status(400).json({ message: "All fields are required" });
        }
        
        // If an image was uploaded, save its filename or path
        let image = "";
        if (req.file) {
            image = req.file.filename; // or `${req.protocol}://${req.get("host")}/upload/${req.file.filename}` for full URL
            console.log('[CREATE EMPLOYEE BY MANAGER] Image uploaded:', image);
        }
        
        const managerId = user.id;
        const createdBy = user.id;
        const isCreatedByAdmin = false;
        
        // If siteId not provided, use manager's siteId from req.user (set by middleware)
        let finalSiteId = siteId || user.siteId || null;
        if (finalSiteId === 'null' || finalSiteId === '') finalSiteId = null;

        const defaultAutoPunch = finalSiteId ? true : false;
        const { autoPunchEnabled } = req.body;
        const finalAutoPunch = typeof autoPunchEnabled !== 'undefined' && autoPunchEnabled !== null
          ? Boolean(autoPunchEnabled)
          : defaultAutoPunch;
        
        const newEmployee = new Employee({ 
            email, 
            name, 
            mobile, 
            address, 
            managerId, 
            shift, 
            createdBy, 
            isCreatedByAdmin,
            image, // optional image field
            siteId: finalSiteId,
            autoPunchEnabled: finalAutoPunch
        });
        await newEmployee.save();
        res.status(201).json({ message: "Employee created successfully", employee: newEmployee });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "Email already exists" });
        }
        console.error("Error creating employee by manager:", error);
        res.status(500).json({ message: "Error creating employee by manager", error });
    }
};

// Toggle auto punch for single employee
export const toggleAutoPunch = async (req, res) => {
  try {
    const { id } = req.params;
    const { autoPunchEnabled } = req.body;

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    employee.autoPunchEnabled = typeof autoPunchEnabled === 'boolean' 
      ? autoPunchEnabled 
      : !employee.autoPunchEnabled;

    await employee.save();

    res.status(200).json({
      message: `Auto punch ${employee.autoPunchEnabled ? 'enabled' : 'disabled'} for ${employee.name}`,
      employee
    });
  } catch (error) {
    console.error("Error toggling auto punch:", error);
    res.status(500).json({ message: "Error toggling auto punch", error: error.message });
  }
};

// Bulk toggle auto punch for multiple employees
export const bulkToggleAutoPunch = async (req, res) => {
  try {
    const { employeeIds, autoPunchEnabled } = req.body;

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ message: "Employee IDs array is required" });
    }

    const targetState = Boolean(autoPunchEnabled);
    const objectIds = employeeIds.map(id => new mongoose.Types.ObjectId(id));

    const result = await Employee.updateMany(
      { _id: { $in: objectIds } },
      { $set: { autoPunchEnabled: targetState } }
    );

    res.status(200).json({
      message: `Auto punch set to ${targetState ? 'ON' : 'OFF'} for ${result.modifiedCount} employee(s)`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error("Error bulk updating auto punch:", error);
    res.status(500).json({ message: "Error updating auto punch status", error: error.message });
  }
};
