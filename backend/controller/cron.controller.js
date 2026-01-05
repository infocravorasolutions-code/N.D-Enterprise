
import Attendance from "../models/attendence.models.js";
import Employee from "../models/employee.models.js";
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

  // ============================================
  // TEMPORARY TEST MODE - Set to true to step out ALL employees every 5 minutes
  // Set to false for production (normal shift-based auto step-out)
  // ============================================
  const TEST_MODE_STEP_OUT_ALL = false; // Production mode: shift-based auto step-out
  // ============================================

  const now = getCurrentISTTime();
  
  try {
    // Find all open attendance records (both global and site-specific)
    // Don't populate employeeId initially to get raw siteId from attendance record
    const openRecords = await Attendance.find({
      stepOut: null
    });

    console.log(`Found ${openRecords.length} open attendance records`);
    
    if (TEST_MODE_STEP_OUT_ALL) {
      console.log("⚠️  TEST MODE ENABLED: Stepping out ALL employees regardless of shift end time");
    }

    let steppedOutCount = 0;
    let skippedCount = 0;
    let globalCount = 0;
    let siteCount = 0;
    let errorCount = 0;

    for (const attendance of openRecords) {
      try {
        // Get employee ID (handle both populated and unpopulated cases)
        const employeeId = attendance.employeeId?._id || attendance.employeeId;
        
        if (!employeeId) {
          console.log(`Attendance record ${attendance._id} has no employeeId. Skipping.`);
          skippedCount++;
          continue;
        }

        // Get siteId from attendance record (this is the key for site employees)
        const attendanceSiteId = attendance.siteId;
        const isSiteAttendance = attendanceSiteId !== null && attendanceSiteId !== undefined;

        // Get employee shift (from attendance record or fetch from employee)
        let shift = attendance.shift;
        
        // If shift not in attendance record, fetch from employee
        if (!shift) {
          const employee = await Employee.findById(employeeId).select('shift siteId');
          shift = employee?.shift || 'morning';
          
          // Log if there's a mismatch between employee siteId and attendance siteId
          if (employee?.siteId && !attendanceSiteId) {
            console.log(`Warning: Employee ${employeeId} has siteId ${employee.siteId} but attendance record ${attendance._id} has no siteId`);
          } else if (!employee?.siteId && attendanceSiteId) {
            console.log(`Warning: Attendance record ${attendance._id} has siteId ${attendanceSiteId} but employee ${employeeId} has no siteId`);
          }
        }
        
        // In TEST MODE: Step out all employees immediately
        // In PRODUCTION: Check shift end time
        let shouldStepOut = false;
        
        if (TEST_MODE_STEP_OUT_ALL) {
          // TEST MODE: Step out everyone
          shouldStepOut = true;
          console.log(`[TEST MODE] Stepping out employee ${employeeId} ${isSiteAttendance ? `[Site: ${attendanceSiteId}]` : '[Global]'}`);
        } else {
          // PRODUCTION MODE: Calculate shift end time based on shift type (in IST)
          const shiftEndTime = getShiftEndTime(attendance.stepIn, shift);
          
          // Add a 15-minute buffer after shift end time before auto clock-out
          const autoClockOutTime = new Date(shiftEndTime.getTime() + 15 * 60 * 1000); // 15 minutes after shift end
          
          // Debug logging for site employees
          if (isSiteAttendance) {
            const stepInIST = new Date(attendance.stepIn).toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
            const shiftEndIST = shiftEndTime.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
            const autoClockOutIST = autoClockOutTime.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
            const nowIST = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
            console.log(`[Site Employee ${employeeId}] Shift: ${shift}, StepIn (IST): ${stepInIST}, ShiftEnd (IST): ${shiftEndIST}, AutoClockOut (IST): ${autoClockOutIST}, Now (IST): ${nowIST}`);
          }
          
          // Check if current time has passed the auto clock-out time
          shouldStepOut = now >= autoClockOutTime;
        }
        
        if (shouldStepOut) {
          const stepOutTime = getCurrentISTTime();
          const totalTime = Math.round((stepOutTime - attendance.stepIn) / 60000); // in minutes

          // Update attendance record
          attendance.stepOut = stepOutTime;
          attendance.totalTime = totalTime;
          if (TEST_MODE_STEP_OUT_ALL) {
            attendance.note = `[TEST MODE] Auto stepped out - testing cron job functionality`;
          } else {
            attendance.note = attendance.note || `Auto stepped out after ${shift} shift end time`;
          }
          await attendance.save();

          // Update employee working status only if this is the only open attendance for this employee
          // Check if there are other open attendance records for this employee
          const otherOpenAttendance = await Attendance.findOne({
            employeeId: employeeId,
            _id: { $ne: attendance._id },
            stepOut: null
          });

          // Only update isWorking to false if there are no other open attendance records
          if (!otherOpenAttendance) {
            await Employee.findByIdAndUpdate(employeeId, { isWorking: false });
          } else {
            console.log(`Employee ${employeeId} has other open attendance records. Keeping isWorking: true`);
          }

          steppedOutCount++;
          if (isSiteAttendance) {
            siteCount++;
            console.log(`Auto-stepped out: Employee ${employeeId} [Site: ${attendanceSiteId}] for ${shift} shift`);
          } else {
            globalCount++;
            console.log(`Auto-stepped out: Employee ${employeeId} [Global] for ${shift} shift`);
          }
        } else {
          // Only log "shift not ended" in production mode (not test mode)
          if (!TEST_MODE_STEP_OUT_ALL) {
            skippedCount++;
            // Calculate shift end time for logging
            const shiftEndTime = getShiftEndTime(attendance.stepIn, shift);
            const autoClockOutTime = new Date(shiftEndTime.getTime() + 15 * 60 * 1000);
            const timeRemaining = Math.round((autoClockOutTime - now) / 60000); // minutes
            const employeeType = isSiteAttendance ? `[Site: ${attendanceSiteId}]` : '[Global]';
            console.log(`Employee ${employeeId} ${employeeType} shift not ended yet. ${timeRemaining} minutes remaining.`);
          }
        }
      } catch (error) {
        errorCount++;
        console.error(`Error processing attendance record ${attendance._id}:`, error);
      }
    }

    console.log(`Auto step-out completed:`);
    if (TEST_MODE_STEP_OUT_ALL) {
      console.log(`⚠️  TEST MODE: All employees stepped out for testing`);
    }
    console.log(`- Stepped out: ${steppedOutCount} (Global: ${globalCount}, Site: ${siteCount})`);
    if (!TEST_MODE_STEP_OUT_ALL) {
      console.log(`- Skipped (shift not ended): ${skippedCount}`);
    }
    console.log(`- Errors: ${errorCount}`);
    console.log(`- Total processed: ${openRecords.length}`);

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
    
    // Find ALL employees assigned to this shift who are not currently working
    // This includes both global employees (siteId: null) and site employees (siteId exists)
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
        // Determine if this is a global or site employee
        const isSiteEmployee = employee.siteId !== null && employee.siteId !== undefined;
        const employeeSiteId = isSiteEmployee ? employee.siteId : null;

        // Check if employee already has an open attendance record
        // For global employees: check only global attendance (siteId: null)
        // For site employees: check attendance for their specific site
        const openAttendance = await Attendance.findOne({
          employeeId: employee._id,
          stepOut: null,
          siteId: employeeSiteId // Match the employee's siteId (null for global, actual siteId for site employees)
        });

        if (openAttendance) {
          const employeeType = isSiteEmployee ? `Site (${employeeSiteId})` : 'Global';
          console.log(`Employee ${employee.name} (${employee._id}) [${employeeType}] already has open attendance. Skipping.`);
          skippedCount++;
          continue;
        }

        // Check if employee was already auto-stepped-in today for this shift
        // For global employees: check only global attendance (siteId: null)
        // For site employees: check attendance for their specific site
        const todayAttendance = await Attendance.findOne({
          employeeId: employee._id,
          shift: currentShift,
          siteId: employeeSiteId, // Match the employee's siteId
          stepIn: { $gte: todayStart },
          note: { $regex: /Auto stepped in/i }
        });

        if (todayAttendance) {
          const employeeType = isSiteEmployee ? `Site (${employeeSiteId})` : 'Global';
          console.log(`Employee ${employee.name} (${employee._id}) [${employeeType}] already auto-stepped-in today for ${currentShift} shift. Skipping.`);
          skippedCount++;
          continue;
        }

        // Get random location for this employee
        const randomLocation = randomLocations[Math.floor(Math.random() * randomLocations.length)];

        // Create attendance record
        // For global employees: siteId will be null
        // For site employees: siteId will be their assigned siteId
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
          shift: currentShift,
          siteId: employeeSiteId // Set siteId: null for global employees, actual siteId for site employees
        });

        await attendance.save();
        
        // Update employee status
        await Employee.findByIdAndUpdate(employee._id, { isWorking: true });

        steppedInCount++;
        if (isSiteEmployee) {
          siteCount++;
          console.log(`Auto-stepped in: ${employee.name} (${employee._id}) [Site: ${employeeSiteId}] for ${currentShift} shift at ${randomLocation}`);
        } else {
          globalCount++;
          console.log(`Auto-stepped in: ${employee.name} (${employee._id}) [Global] for ${currentShift} shift at ${randomLocation}`);
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
}