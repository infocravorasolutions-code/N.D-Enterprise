import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from './models/employee.models.js';
import Site from './models/site.models.js';
import Manager from './models/manager.models.js';
import Attendance from './models/attendence.models.js';

dotenv.config();

const randomLocations = [
  "Gujari bajar",
  "Dhobi Ghat",
  "Khodiyar nagar parking",
  "Subhash Bridge"
];

// Target dates to backfill: 2026-08-26 through 2026-09-07
const datesToBackfill = [
  "2026-08-26",
  "2026-08-27",
  "2026-08-28",
  "2026-08-29",
  "2026-08-30",
  "2026-08-31",
  "2026-09-01",
  "2026-09-02",
  "2026-09-03",
  "2026-09-04",
  "2026-09-05",
  "2026-09-06",
  "2026-09-07"
];

const shifts = ['morning', 'evening', 'night'];

const runBackfill = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI missing from .env');
      process.exit(1);
    }

    console.log('\n===============================================================');
    console.log('🚀 STARTING ATTENDANCE BACKFILL: Aug 26, 2026 to Sep 07, 2026');
    console.log('===============================================================\n');

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Fetch active sites
    const activeSites = await Site.find({ status: 'active', isActive: { $ne: false } });
    const siteMap = new Map();
    activeSites.forEach(s => siteMap.set(s._id.toString(), s));
    console.log(`🏢 Active sites found: ${activeSites.length}`);

    // Fetch default manager if needed
    const defaultManager = await Manager.findOne({});

    // Fetch all employees eligible for auto-punch
    const employees = await Employee.find({ autoPunchEnabled: { $ne: false } });
    console.log(`👥 Total auto-punch enabled employees: ${employees.length}`);

    // Fetch existing attendance in date range to prevent duplicates
    const startRange = new Date("2026-08-26T00:00:00+05:30");
    const endRange = new Date("2026-09-08T23:59:59+05:30");
    const existingAtts = await Attendance.find({
      stepIn: { $gte: startRange, $lte: endRange }
    });

    const existingKeySet = new Set();
    existingAtts.forEach(att => {
      const d = new Date(att.stepIn);
      const istDateStr = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // YYYY-MM-DD
      const key = `${att.employeeId.toString()}_${istDateStr}_${(att.shift || '').toLowerCase()}`;
      existingKeySet.add(key);
    });

    console.log(`ℹ️ Existing attendance records in range: ${existingAtts.length}`);

    const newAttendanceRecords = [];
    let skippedCount = 0;

    for (const dateStr of datesToBackfill) {
      console.log(`📅 Processing Date: ${dateStr}...`);

      for (const emp of employees) {
        const empShift = (emp.shift || 'morning').toLowerCase();
        const key = `${emp._id.toString()}_${dateStr}_${empShift}`;

        if (existingKeySet.has(key)) {
          skippedCount++;
          continue;
        }

        const isSiteEmployee = Boolean(emp.siteId);
        const empSiteId = isSiteEmployee ? emp.siteId.toString() : null;
        let site = null;
        let address = "";

        if (isSiteEmployee) {
          site = siteMap.get(empSiteId);
          if (!site) {
            // Site not active or not found, skip
            continue;
          }
          address = site.name;
        } else {
          address = randomLocations[Math.floor(Math.random() * randomLocations.length)];
        }

        // Randomize minutes & seconds for realistic step-in
        const randMin = String(Math.floor(Math.random() * 30)).padStart(2, '0');
        const randSec = String(Math.floor(Math.random() * 60)).padStart(2, '0');

        let stepInIso = '';
        if (empShift === 'morning') {
          // 07:00 AM to 07:30 AM IST (+05:30)
          stepInIso = `${dateStr}T07:${randMin}:${randSec}+05:30`;
        } else if (empShift === 'evening') {
          // 03:00 PM to 03:30 PM IST (+05:30)
          stepInIso = `${dateStr}T15:${randMin}:${randSec}+05:30`;
        } else if (empShift === 'night') {
          // 11:00 PM to 11:30 PM IST (+05:30)
          stepInIso = `${dateStr}T23:${randMin}:${randSec}+05:30`;
        } else {
          stepInIso = `${dateStr}T07:${randMin}:${randSec}+05:30`;
        }

        const stepInDate = new Date(stepInIso);
        // Shift duration 8 hours + 0 to 15 min random buffer
        const workDurationMins = 480 + Math.floor(Math.random() * 15);
        const stepOutDate = new Date(stepInDate.getTime() + workDurationMins * 60 * 1000);

        const note = isSiteEmployee
          ? `Auto stepped in for ${empShift} shift at site "${address}"`
          : `Auto stepped in for ${empShift} shift`;

        newAttendanceRecords.push({
          employeeId: emp._id,
          managerId: emp.managerId || defaultManager?._id,
          stepIn: stepInDate,
          stepOut: stepOutDate,
          stepInImage: null,
          stepOutImage: null,
          stepInLongitude: 0,
          stepInLatitude: 0,
          stepInAddress: address,
          stepOutLongitude: 0,
          stepOutLatitude: 0,
          stepOutAddress: address,
          longitude: 0,
          latitude: 0,
          address: address,
          shift: empShift,
          totalTime: workDurationMins,
          note: note,
          siteId: isSiteEmployee ? emp.siteId : null
        });

        existingKeySet.add(key);
      }
    }

    console.log(`\n⚡ Prepared ${newAttendanceRecords.length} attendance records to insert.`);
    console.log(`⏭️ Skipped ${skippedCount} existing records.`);

    if (newAttendanceRecords.length > 0) {
      const CHUNK_SIZE = 1000;
      for (let i = 0; i < newAttendanceRecords.length; i += CHUNK_SIZE) {
        const chunk = newAttendanceRecords.slice(i, i + CHUNK_SIZE);
        await Attendance.insertMany(chunk, { ordered: false });
        console.log(`   Inserted chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(newAttendanceRecords.length / CHUNK_SIZE)} (${chunk.length} records)`);
      }
    }

    console.log('\n===============================================================');
    console.log('🎉 BACKFILL COMPLETED SUCCESSFULLY!');
    console.log('===============================================================');
    console.log(`✅ Total Records Inserted: ${newAttendanceRecords.length}`);
    console.log(`📅 Dates Backfilled: ${datesToBackfill.join(', ')}`);
    console.log('===============================================================\n');

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error during backfill:', error);
    process.exit(1);
  }
};

runBackfill();
