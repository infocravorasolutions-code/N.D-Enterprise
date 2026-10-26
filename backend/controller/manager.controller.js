import Manager from "../models/manager.models.js";
import Employee from "../models/employee.models.js";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { get } from "http";
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

export const createManager = async (req, res) => {
  try {
    const { email, password, name, mobile, address, adminId, siteId } = req.body;
    console.log('📝 [createManager] Request body:', req.body);
    
    if(!adminId || !email || !password || !name || !mobile || !address){
      console.log('❌ [createManager] Missing required fields:', { adminId, email, password, name, mobile, address });
      return res.status(400).json({message:"All fields are required"});
    }


    const hashedPassword = await bcrypt.hash(password, 10);

    const newManager = new Manager({ 
      email, 
      password: hashedPassword, 
      name, 
      mobile, 
      address, 
      createdBy: adminId,
      userType: 'manager',
      isActive: true,
      siteId: siteId || null // optional siteId field
    });
    
    console.log('💾 [createManager] Saving manager:', newManager);
    await newManager.save();
    console.log('✅ [createManager] Manager saved successfully:', newManager._id);
    
    // If manager was assigned to a site, link any employees on that site to this manager
    if (siteId && siteId !== 'null' && siteId !== '') {
      try {
        const siteObjectId = new mongoose.Types.ObjectId(siteId);
        const linkResult = await Employee.updateMany(
          { siteId: siteObjectId },
          { $set: { managerId: newManager._id } }
        );
        console.log(`[createManager] Linked ${linkResult.modifiedCount} employees on site ${siteId} to new manager ${newManager._id}`);
      } catch (linkErr) {
        console.error('[createManager] Error linking employees to new manager:', linkErr);
      }
    }

    res.status(201).json({ message: "Manager created successfully", manager: newManager });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Email already exists" });
    }
    console.error("Error creating manager:", error);
    res.status(500).json({ message: "Error creating manager", error });
  }
}

export const getManager = async (req, res) => {
  try {
    const manager = await Manager.findById(req.params.id);
    if (!manager) {
      return res.status(404).json({ message: "Manager not found" });
    }
    res.status(200).json(manager);
  } catch (error) {
    res.status(500).json({ message: "Error fetching manager", error });
  }
};

export const updateManager = async (req, res) => {
  try {
    const updateData = { ...req.body };

    // Only hash password if it's being updated
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    const updatedManager = await Manager.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    if (!updatedManager) {
      return res.status(404).json({ message: "Manager not found" });
    }

    // If manager is assigned to a site, link any employees on that site to this manager
    if (updatedManager.siteId) {
      try {
        const siteObjectId = new mongoose.Types.ObjectId(updatedManager.siteId);
        const linkResult = await Employee.updateMany(
          { siteId: siteObjectId },
          { $set: { managerId: updatedManager._id } }
        );
        console.log(`[updateManager] Linked ${linkResult.modifiedCount} employees on site ${updatedManager.siteId} to manager ${updatedManager._id}`);
      } catch (linkErr) {
        console.error('[updateManager] Error linking employees to manager:', linkErr);
      }
    }

    res.status(200).json({ message: "Manager updated successfully", manager: updatedManager });
  } catch (error) {
    console.error("Error updating manager:", error);
    res.status(500).json({ message: "Error updating manager", error });
  }
};
export const deleteManager = async (req, res) => {
  try {
    const deletedManager = await Manager.findByIdAndDelete(req.params.id);
    if (!deletedManager) {
      return res.status(404).json({ message: "Manager not found" });
    }
    res.status(200).json({ message: "Manager deleted successfully" });
  } catch (error) {
    console.error("Error deleting manager:", error);
    res.status(500).json({ message: "Error deleting manager", error });
  }
};


export const loginManager = async (req, res) => {
  try {
    const { email, password } = req.body;
    const manager = await Manager.findOne({ email });
    if (!manager) {
      return res.status(404).json({ message: "Manager not found" });
    }
    
    // Check if manager is active
    if (!manager.isActive) {
      return res.status(403).json({ message: "Your account is inactive. Please contact administrator." });
    }
    
    const isPasswordValid = await bcrypt.compare(password, manager.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid password" });
    }       
    
    const token = jwt.sign({ id: manager._id, email: manager.email, userType: manager.userType }, JWT_SECRET, { expiresIn: '1y' });
    
    // Return manager data including siteId
    const managerData = {
      _id: manager._id,
      name: manager.name,
      email: manager.email,
      mobile: manager.mobile,
      address: manager.address,
      userType: manager.userType,
      isActive: manager.isActive,
      siteId: manager.siteId || null // Include siteId in response
    };
    
    res.status(200).json({ message: "Login successful", token, manager: managerData });
    }
    catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ message: "Error logging in", error });
    }   
}

export const getAllManagers = async (req, res) => {
  try {
    // Only return global managers (not assigned to any site)
    const managers = await Manager.find({ siteId: null });
    console.log("managers",managers)
    res.status(200).json({message:"success" ,data:managers});
  } catch (error) {
    console.error("Error fetching managers:", error);
    res.status(500).json({ message: "Error fetching managers", error });
  }
};