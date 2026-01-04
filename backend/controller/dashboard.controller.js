import Employee from "../models/employee.models.js";
import Manager from "../models/manager.models.js";

export const getDashboardData = async (req, res) => {
  try {
    // Total employees
    const totalEmployees = await Employee.countDocuments();

    // Total managers
    const totalManagers = await Manager.countDocuments();

    // Working employees
    const workingEmployees = await Employee.countDocuments({ isWorking: true });

    // Shift-wise employee count
    const shiftAggregation = await Employee.aggregate([
      {
        $group: {
          _id: "$shift",
          count: { $sum: 1 }
        }
      }
    ]);

    // Format shift data
    const shiftWise = {};
    shiftAggregation.forEach(item => {
      shiftWise[item._id] = item.count;
    });

    res.status(200).json({
      totalEmployees,
      totalManagers,
      workingEmployees,
      shiftWise
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Error fetching dashboard stats", error });
  }
};