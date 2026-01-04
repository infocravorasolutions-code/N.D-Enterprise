
import Attendance from "../models/attendence.models.js";
import Employee from "../models/employee.models.js";
import { getCurrentISTTime, getHoursAgoInIST, getCurrentISTHour } from "../utils/timeUtils.js";

// Run every 30 minutes
export const autoStepOut = async () => {
  console.log("Running auto-step-out check...");

  const now = getCurrentISTTime();
  const eightHoursAgo = getHoursAgoInIST(8);
console.log("eightHoursAgo",eightHoursAgo)
  try {
    const records = await Attendance.find({
      stepOut: null,
      stepIn: { $lte: eightHoursAgo }
    });
    console.log("Now:", now);
    console.log("Eight hours ago:", eightHoursAgo);
    console.log("Matched records:", records.map(r => r._id));
    for (const attendance of records) {
        // Use server time (IST) for stepOutTime
      const stepOutTime = getCurrentISTTime();
      const totalTime = Math.round((stepOutTime - attendance.stepIn) / 60000);

      attendance.stepOut = stepOutTime;
      attendance.totalTime = totalTime;
      attendance.note = attendance.note || "Auto stepped out after 8 hours";
      await attendance.save();

      await Employee.findByIdAndUpdate(attendance.employeeId, { isWorking: false });

      console.log(`Auto-stepped out: ${attendance.employeeId}`);
    }
  } catch (error) {
    console.error("Auto step-out failed:", error);
  }
}

// Run every 1 hour - Auto step-in at shift start times (7 AM, 3 PM, 11 PM)
export const autoStepIn = async () => {
  console.log("Running auto-step-in check...");

  const now = getCurrentISTTime();
  const currentHour = getCurrentISTHour(); // Get hour in IST (0-23)
  
  // Define shift start times and their corresponding shifts
  const shiftStartTimes = {
    7: 'morning',   // 7 AM
    15: 'evening',  // 3 PM (15:00)
    23: 'night'     // 11 PM (23:00)
  };

  // Check if current hour matches any shift start time
  const currentShift = shiftStartTimes[currentHour];
  
  if (!currentShift) {
    console.log(`Current hour (${currentHour}) is not a shift start time. Skipping auto step-in.`);
    return;
  }

  console.log(`Shift start detected: ${currentShift} shift at ${currentHour}:00`);

  // Random locations for auto step-in
  const randomLocations = [
    "Gujari bajar",
    "Dhobi Ghat",
    "Khodiyar nagar parking",
    "Subhash Bridge"
  ];

  try {
    // Get start of today in IST for duplicate checking
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    // Find employees assigned to this shift who:
    // 1. Are not currently working (isWorking: false)
    // 2. Don't have an open attendance record (no stepOut: null)
    // 3. Haven't been auto-stepped-in today for this shift
    const employees = await Employee.find({
      shift: currentShift,
      isWorking: false
    });

    console.log(`Found ${employees.length} employees for ${currentShift} shift`);

    let steppedInCount = 0;
    let skippedCount = 0;

    for (const employee of employees) {
      try {
        // Check if employee already has an open attendance record
        const openAttendance = await Attendance.findOne({
          employeeId: employee._id,
          stepOut: null
        });

        if (openAttendance) {
          console.log(`Employee ${employee.name} (${employee._id}) already has open attendance. Skipping.`);
          skippedCount++;
          continue;
        }

        // Check if employee was already auto-stepped-in today for this shift
        const todayAttendance = await Attendance.findOne({
          employeeId: employee._id,
          shift: currentShift,
          stepIn: { $gte: todayStart },
          note: { $regex: /Auto stepped in/i }
        });

        if (todayAttendance) {
          console.log(`Employee ${employee.name} (${employee._id}) already auto-stepped-in today for ${currentShift} shift. Skipping.`);
          skippedCount++;
          continue;
        }

        // Get random location for this employee
        const randomLocation = randomLocations[Math.floor(Math.random() * randomLocations.length)];

        // Create attendance record
        const stepIn = getCurrentISTTime();
        const attendance = new Attendance({
          employeeId: employee._id,
          managerId: employee.managerId, // Use employee's managerId so managers can see them
          stepIn,
          stepInImage: null, // No image for auto step-in
          stepInLongitude: 0, // Default coordinates
          stepInLatitude: 0,
          stepInAddress: randomLocation,
          // Keep legacy fields for backward compatibility
          longitude: 0,
          latitude: 0,
          address: randomLocation,
          note: `Auto stepped in for ${currentShift} shift`,
          shift: currentShift
        });

        await attendance.save();
        
        // Update employee status
        await Employee.findByIdAndUpdate(employee._id, { isWorking: true });

        steppedInCount++;
        console.log(`Auto-stepped in: ${employee.name} (${employee._id}) for ${currentShift} shift at ${randomLocation}`);
      } catch (error) {
        console.error(`Error processing employee ${employee.name} (${employee._id}):`, error);
      }
    }

    console.log(`Auto step-in completed for ${currentShift} shift:`);
    console.log(`- Stepped in: ${steppedInCount}`);
    console.log(`- Skipped: ${skippedCount}`);
    console.log(`- Total processed: ${employees.length}`);

  } catch (error) {
    console.error("Auto step-in failed:", error);
  }
}