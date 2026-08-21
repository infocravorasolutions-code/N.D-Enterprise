
import Attendance from "../models/attendence.models.js";
import Employee from "../models/employee.models.js";
import Site from "../models/site.models.js";
import { getCurrentISTTime, getHoursAgoInIST, getCurrentISTHour } from "../utils/timeUtils.js";

// Function to get shift end time based on shift type and clock-in time (in IST)
const getShiftEndTime = (clockInTime, shift) => {
  // Convert clockInTime to IST for date extraction
  const clockInDate = new Date(clockInTime);
  
  // Get IST date components using Intl.DateTimeFormat for more reliable parsing
  const istFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  
  const parts = istFormatter.formatToParts(clockInDate);
  const getPart = (type) => {
    const part = parts.find(p => p.type === type);
    return part ? parseInt(part.value, 10) : 0;
  };
  
  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  
  // Create date string in ISO format with IST timezone offset (+05:30)
  const createISTDateString = (y, m, d, h, min, s = 0) => {
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(s).padStart(2, '0')}+05:30`;
  };
  
  switch (shift) {
    case 'morning':
      // Morning shift ends at 3:00 PM same day in IST
      return new Date(createISTDateString(year, month, day, 15, 0, 0));
    case 'evening':
      // Evening shift ends at 11:00 PM same day in IST
      return new Date(createISTDateString(year, month, day, 23, 0, 0));
    case 'night':
      // Night shift ends at 7:00 AM next day in IST
      // Calculate next day in IST
      const nextDayDate = new Date(clockInDate);
      nextDayDate.setUTCDate(nextDayDate.getUTCDate() + 1);
      const nextDayParts = istFormatter.formatToParts(nextDayDate);
      const nextYear = parseInt(nextDayParts.find(p => p.type === 'year').value, 10);
      const nextMonth = parseInt(nextDayParts.find(p => p.type === 'month').value, 10);
      const nextDay = parseInt(nextDayParts.find(p => p.type === 'day').value, 10);
      return new Date(createISTDateString(nextYear, nextMonth, nextDay, 7, 0, 0));
    default:
      // Default to 8 hours from clock-in
      return new Date(clockInTime.getTime() + 8 * 60 * 60 * 1000);
  }
};

// Run every 30 minutes - Auto step-out based on shift end times
export const autoStepOut = async () => {
  console.log("Running auto-step-out check...");

  const TEST_MODE_STEP_OUT_ALL = false; // Production mode: shift-based auto step-out

  const now = getCurrentISTTime();
  
  try {
    // Find all open attendance records (both global and site-specific)
    const openRecords = await Attendance.find({
      stepOut: null
    });

    console.log(`Found ${openRecords.length} open attendance records`);
    
    // Pre-fetch active sites to annotate site step-out address
    const activeSites = await Site.find({});
    const siteMap = new Map();
    activeSites.forEach(s => siteMap.set(s._id.toString(), s));

    let steppedOutCount = 0;
    let skippedCount = 0;
    let globalCount = 0;
    let siteCount = 0;
    let errorCount = 0;

    for (const attendance of openRecords) {
      try {
        const employeeId = attendance.employeeId?._id || attendance.employeeId;
        
        if (!employeeId) {
          console.log(`Attendance record ${attendance._id} has no employeeId. Skipping.`);
          skippedCount++;
          continue;
        }

        const attendanceSiteId = attendance.siteId ? attendance.siteId.toString() : null;
        const isSiteAttendance = Boolean(attendanceSiteId);
        const site = isSiteAttendance ? siteMap.get(attendanceSiteId) : null;

        let shift = attendance.shift;
        if (!shift) {
          const employee = await Employee.findById(employeeId).select('shift siteId');
          shift = employee?.shift || 'morning';
        }
        
        let shouldStepOut = false;
        
        if (TEST_MODE_STEP_OUT_ALL) {
          shouldStepOut = true;
        } else {
          const shiftEndTime = getShiftEndTime(attendance.stepIn, shift);
          // 15-minute buffer after shift end time before auto clock-out
          const autoClockOutTime = new Date(shiftEndTime.getTime() + 15 * 60 * 1000);
          shouldStepOut = now >= autoClockOutTime;
        }
        
        if (shouldStepOut) {
          const stepOutTime = getCurrentISTTime();
          const totalTime = Math.round((stepOutTime - attendance.stepIn) / 60000); // in minutes

          attendance.stepOut = stepOutTime;
          attendance.totalTime = totalTime;

          if (isSiteAttendance && site) {
            attendance.stepOutAddress = site.name;
            attendance.note = attendance.note || `Auto stepped out after ${shift} shift at site "${site.name}"`;
          } else {
            attendance.note = attendance.note || `Auto stepped out after ${shift} shift end time`;
          }

          await attendance.save();

          // Update employee working status if no other open attendance records exist
          const otherOpenAttendance = await Attendance.findOne({
            employeeId: employeeId,
            _id: { $ne: attendance._id },
            stepOut: null
          });

          if (!otherOpenAttendance) {
            await Employee.findByIdAndUpdate(employeeId, { isWorking: false });
          }

          steppedOutCount++;
          if (isSiteAttendance) {
            siteCount++;
            console.log(`Auto-stepped out: Employee ${employeeId} [Site: ${site?.name || attendanceSiteId}] for ${shift} shift`);
          } else {
            globalCount++;
            console.log(`Auto-stepped out: Employee ${employeeId} [Global] for ${shift} shift`);
          }
        } else {
          if (!TEST_MODE_STEP_OUT_ALL) {
            skippedCount++;
          }
        }
      } catch (error) {
        errorCount++;
        console.error(`Error processing attendance record ${attendance._id}:`, error);
      }
    }

    console.log(`Auto step-out completed:`);
    console.log(`- Stepped out: ${steppedOutCount} (Global: ${globalCount}, Site: ${siteCount})`);
    console.log(`- Skipped: ${skippedCount}`);
    console.log(`- Errors: ${errorCount}`);
    console.log(`- Total processed: ${openRecords.length}`);

  } catch (error) {
    console.error("Auto step-out failed:", error);
  }
};

// Run every 1 hour - Auto step-in at shift start times (7 AM, 3 PM, 11 PM)
export const autoStepIn = async (forcedShift = null) => {
  console.log("Running auto-step-in check...");

  const now = getCurrentISTTime();
  const currentHour = getCurrentISTHour(); // Get hour in IST (0-23)
  
  // Define shift start times and their corresponding shifts
  const shiftStartTimes = {
    7: 'morning',   // 7 AM
    15: 'evening',  // 3 PM (15:00)
    23: 'night'     // 11 PM (23:00)
  };

  const currentShift = forcedShift ? forcedShift.toLowerCase() : shiftStartTimes[currentHour];
  
  if (!currentShift) {
    console.log(`Current hour (${currentHour}) is not a shift start time. Skipping auto step-in.`);
    return;
  }

  console.log(`Shift start detected: ${currentShift} shift ${forcedShift ? '(forced mode)' : `at ${currentHour}:00`}`);

  // Random fallback locations for global employees
  const randomLocations = [
    "Gujari bajar",
    "Dhobi Ghat",
    "Khodiyar nagar parking",
    "Subhash Bridge"
  ];

  try {
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Pre-fetch all active sites to map site names and verify active status
    const activeSites = await Site.find({ status: 'active', isActive: { $ne: false } });
    const activeSiteMap = new Map();
    activeSites.forEach(s => activeSiteMap.set(s._id.toString(), s));

    // Find ALL employees assigned to this shift who are not currently working
    const employees = await Employee.find({
      shift: currentShift,
      isWorking: false
    });

    console.log(`Found ${employees.length} employees for ${currentShift} shift`);

    let steppedInCount = 0;
    let skippedCount = 0;
    let globalCount = 0;
    let siteCount = 0;

    for (const employee of employees) {
      try {
        const isSiteEmployee = Boolean(employee.siteId);
        const employeeSiteId = isSiteEmployee ? employee.siteId.toString() : null;

        let stepInAddress = "";

        if (isSiteEmployee) {
          const site = activeSiteMap.get(employeeSiteId);
          // If site is not active or cancelled, skip auto step-in for this employee
          if (!site) {
            console.log(`Site ${employeeSiteId} for employee ${employee.name} is not active. Skipping.`);
            skippedCount++;
            continue;
          }
          stepInAddress = site.name;
        } else {
          stepInAddress = randomLocations[Math.floor(Math.random() * randomLocations.length)];
        }

        // Check if employee already has an open attendance record
        const openAttendance = await Attendance.findOne({
          employeeId: employee._id,
          stepOut: null
        });

        if (openAttendance) {
          const employeeType = isSiteEmployee ? `Site (${stepInAddress})` : 'Global';
          console.log(`Employee ${employee.name} (${employee._id}) [${employeeType}] already has open attendance. Skipping.`);
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
          const employeeType = isSiteEmployee ? `Site (${stepInAddress})` : 'Global';
          console.log(`Employee ${employee.name} (${employee._id}) [${employeeType}] already auto-stepped-in today for ${currentShift} shift. Skipping.`);
          skippedCount++;
          continue;
        }

        // Create attendance record
        const stepIn = getCurrentISTTime();
        const attendance = new Attendance({
          employeeId: employee._id,
          managerId: employee.managerId,
          stepIn,
          stepInImage: null,
          stepInLongitude: 0,
          stepInLatitude: 0,
          stepInAddress: stepInAddress,
          longitude: 0,
          latitude: 0,
          address: stepInAddress,
          note: isSiteEmployee 
            ? `Auto stepped in for ${currentShift} shift at site "${stepInAddress}"` 
            : `Auto stepped in for ${currentShift} shift`,
          shift: currentShift,
          siteId: isSiteEmployee ? employee.siteId : null
        });

        await attendance.save();
        
        // Update employee status
        await Employee.findByIdAndUpdate(employee._id, { isWorking: true });

        steppedInCount++;
        if (isSiteEmployee) {
          siteCount++;
          console.log(`Auto-stepped in: ${employee.name} (${employee._id}) [Site: ${stepInAddress}] for ${currentShift} shift`);
        } else {
          globalCount++;
          console.log(`Auto-stepped in: ${employee.name} (${employee._id}) [Global] for ${currentShift} shift at ${stepInAddress}`);
        }
      } catch (error) {
        console.error(`Error processing employee ${employee.name} (${employee._id}):`, error);
      }
    }

    console.log(`Auto step-in completed for ${currentShift} shift:`);
    console.log(`- Stepped in: ${steppedInCount} (Global: ${globalCount}, Site: ${siteCount})`);
    console.log(`- Skipped: ${skippedCount}`);
    console.log(`- Total processed: ${employees.length}`);

  } catch (error) {
    console.error("Auto step-in failed:", error);
  }
};