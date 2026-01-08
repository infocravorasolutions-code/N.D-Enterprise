import Employee from "../models/employee.models.js";
import Manager from "../models/manager.models.js";
import Site from "../models/site.models.js";

export const getDashboardData = async (req, res) => {
  try {
    const userData = req?.user;
    const isManager = userData?.userType === 'manager';
    const managerId = userData?.id;
    const mongoose = (await import("mongoose")).default;

    // Build match filter for employees
    let employeeMatch = {};
    
    if (isManager) {
      if (userData.siteId) {
        // Site manager: show employees for their site
        const siteObjectId = new mongoose.Types.ObjectId(userData.siteId);
        employeeMatch = { managerId: managerId, siteId: siteObjectId };
      } else {
        // Global manager: show global employees (siteId: null)
        employeeMatch = { managerId: managerId, siteId: null };
      }
    } else if (userData?.userType === 'admin') {
      // Admin filtering
      if (userData.role === 'readonly' && userData.siteId) {
        // Readonly admin assigned to a site - show only employees for that site
        const siteObjectId = new mongoose.Types.ObjectId(userData.siteId);
        employeeMatch = { siteId: siteObjectId };
      } else {
        // Superadmin - show only global employees (siteId: null)
        employeeMatch = { siteId: null };
      }
    } else {
      // Default: show only global employees (siteId: null)
      employeeMatch = { siteId: null };
    }

    // Total employees (filtered by manager and site if site manager)
    const totalEmployees = await Employee.countDocuments(employeeMatch);

    // Total managers (only for admin, exclude site-specific managers)
    const totalManagers = isManager ? 0 : await Manager.countDocuments({ siteId: null });

    // Working employees (filtered by manager and site if site manager)
    const workingEmployees = await Employee.countDocuments({ 
      ...employeeMatch,
      isWorking: true 
    });

    // Shift-wise employee count (filtered by manager and site)
    let shiftMatch = {};
    if (isManager) {
      shiftMatch = userData.siteId 
        ? { managerId: managerId, siteId: new mongoose.Types.ObjectId(userData.siteId) }
        : { managerId: managerId, siteId: null };
    } else if (userData?.userType === 'admin') {
      if (userData.role === 'readonly' && userData.siteId) {
        shiftMatch = { siteId: new mongoose.Types.ObjectId(userData.siteId) };
      } else {
        shiftMatch = { siteId: null };
      }
    } else {
      shiftMatch = { siteId: null };
    }
    
    const shiftAggregation = await Employee.aggregate([
      { $match: shiftMatch },
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

    // Site insights (only for admins)
    let siteInsights = null;
    if (!isManager) {
      const totalSites = await Site.countDocuments();
      const activeSites = await Site.countDocuments({ status: 'active' });
      const completedSites = await Site.countDocuments({ status: 'completed' });
      
      // Count upcoming sites (sites with startDate in the future)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const upcomingSites = await Site.countDocuments({ 
        startDate: { $gt: today },
        status: { $ne: 'completed' }
      });
      
      // Get recent sites (last 5)
      const recentSites = await Site.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name location status startDate endDate')
        .lean();
      
      // Get sites with most employees
      const sitesWithEmployees = await Employee.aggregate([
        { $match: { siteId: { $ne: null } } },
        {
          $group: {
            _id: "$siteId",
            employeeCount: { $sum: 1 }
          }
        },
        { $sort: { employeeCount: -1 } },
        { $limit: 5 }
      ]);
      
      // Populate site names
      const topSites = await Promise.all(
        sitesWithEmployees.map(async (item) => {
          const site = await Site.findById(item._id).select('name location').lean();
          return {
            siteId: item._id,
            name: site?.name || 'Unknown',
            location: site?.location || 'N/A',
            employeeCount: item.employeeCount
          };
        })
      );

      siteInsights = {
        totalSites,
        activeSites,
        completedSites,
        upcomingSites,
        recentSites,
        topSites
      };
    }

    res.status(200).json({
      totalEmployees,
      totalManagers,
      workingEmployees,
      shiftWise,
      siteInsights
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Error fetching dashboard stats", error });
  }
};