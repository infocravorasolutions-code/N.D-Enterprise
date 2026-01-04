import Employee from "../models/employee.models.js";

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
    const { email, name, mobile, address, managerId, shift, createdBy, isCreatedByAdmin } = req.body;

    console.log('[CREATE EMPLOYEE] Payload:', req.body);

    if (!name || !address || !managerId || !shift || isCreatedByAdmin === undefined || createdBy === undefined) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // If an image was uploaded, save its filename or path
    let image = "";
    if (req.file) {
      image = req.file.filename; // or `${req.protocol}://${req.get("host")}/upload/${req.file.filename}` for full URL
    }

    const newEmployee = new Employee({
      email,
      name,
      mobile,
      address,
      managerId,
      shift,
      createdBy,
      isCreatedByAdmin,
      image // optional image field
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
export const getEmployees = async (req, res) => {
  try {
    const { isWorking,shift } = req.query;
    const userData= req?.user
    console.log("userData---->",userData)

    // Build aggregation pipeline
    const pipeline = [];
    
       if(userData.userType=="manager"){
         pipeline.push({ $match: { managerId: userData.id } });
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
    res.status(200).json({ message: "Success", data: employees });
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ message: "Error fetching employees", error });
  }
}

// Manager-specific employee creation
export const createEmployeeByManager = async (req, res) => {
    try {
        const { email, name, mobile, address, shift } = req.body;
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
        const newEmployee = new Employee({ 
            email, 
            name, 
            mobile, 
            address, 
            managerId, 
            shift, 
            createdBy, 
            isCreatedByAdmin,
            image // optional image field
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
