import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from './models/employee.models.js';
import Site from './models/site.models.js';
import Manager from './models/manager.models.js';
import Admin from './models/admin.models.js';
import Attendance from './models/attendence.models.js';

dotenv.config();

// Parse command line arguments
const args = process.argv.slice(2);
let targetMonth = 7; // July by default
let targetYear = 2026; // 2026 by default

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--month' && args[i + 1]) {
    targetMonth = parseInt(args[i + 1], 10);
  }
  if (args[i] === '--year' && args[i + 1]) {
    targetYear = parseInt(args[i + 1], 10);
  }
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const targetMonthName = monthNames[targetMonth - 1];

console.log(`\n===============================================================`);
console.log(`🌱 SEEDING ATTENDANCE FOR: ${targetMonthName} ${targetYear}`);
console.log(`===============================================================\n`);

const fileSiteMap = [
  {
    file: '../Dhruv_Enterprise_Aug_2026_Attendance.xlsx',
    partyName: 'Dhruv Enterprise',
    siteName: 'Balbhavan Office And Under of Nehrubridge Light Office Safai Work'
  },
  {
    file: '../Dhruv_Enterprise_Aug_2026_Attendance_Completed (2).xlsx',
    partyName: 'Dhruv Enterprise',
    siteName: 'East Side Near Full Bajar Plot Safai Work'
  },
  {
    file: '../NIYA_ENTERPRISE_Aug_2026_Attendance.xlsx',
    partyName: 'NIYA ENTERPRISE',
    siteName: 'Multi Level Parking all area and surrounding area Cleaning work'
  },
  {
    file: '../SHIV_ENTERPRISE_Aug_2026_Attendance.xlsx',
    partyName: 'SHIV ENTERPRISE',
    siteName: 'East Side Fez-2 Lower Prominade, Middle Prominade, Upper Prominade Cleaning work'
  }
];

const ignoreKeywords = ['total', 'p = present', 'present', 'absent', 'no.', 'worker name', 'party name', 'work details'];

const isIgnoredWorker = (name) => {
  if (!name) return true;
  const str = String(name).trim().toLowerCase();
  if (!str) return true;
  return ignoreKeywords.some(kw => str.includes(kw));
};

const seedAttendance = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI missing from .env');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Get default admin and manager
    const admin = await Admin.findOne({ email: 'mohit123456rathod@gmail.com' }) || await Admin.findOne();
    const manager = await Manager.findOne({ email: 'jitandrasolanki10@gmail.com' }) || await Manager.findOne();

    if (!admin || !manager) {
      console.error('❌ Admin or Manager not found in database.');
      process.exit(1);
    }

    console.log(`👤 Admin: ${admin.name} (${admin.email})`);
    console.log(`👔 Manager: ${manager.name} (${manager.email})\n`);

    // Pre-fetch all existing employees for fast lookup
    const allEmployees = await Employee.find({});
    const empMapByName = new Map();
    allEmployees.forEach(emp => {
      empMapByName.set(emp.name.trim().toLowerCase(), emp);
    });

    const startOfMonth = new Date(`${targetYear}-${String(targetMonth).padStart(2, '0')}-01T00:00:00+05:30`);
    const lastDayOfMonth = new Date(targetYear, targetMonth, 0).getDate();
    const endOfMonth = new Date(`${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}T23:59:59+05:30`);

    // Pre-fetch all existing attendance for target month
    const existingAtts = await Attendance.find({
      stepIn: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const existingAttKeys = new Set();
    existingAtts.forEach(att => {
      const d = new Date(att.stepIn);
      const dayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      existingAttKeys.add(`${att.employeeId.toString()}_${dayStr}`);
    });

    let totalEmployeesCreated = 0;
    let totalEmployeesUpdated = 0;
    let totalAttendanceInserted = 0;
    let totalAttendanceSkipped = 0;

    const newAttendanceDocs = [];

    for (const mapping of fileSiteMap) {
      const filePath = path.resolve(mapping.file);
      console.log(`---------------------------------------------------------------`);
      console.log(`📄 File: ${path.basename(filePath)}`);
      console.log(`🏗️ Site: "${mapping.siteName}"`);

      if (!fs.existsSync(filePath)) {
        console.error(`⚠️ File not found: ${filePath}`);
        continue;
      }

      let site = await Site.findOne({ name: mapping.siteName });
      if (!site) {
        const escaped = mapping.siteName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        site = await Site.findOne({ name: { $regex: new RegExp(escaped, 'i') } });
      }

      if (!site) {
        console.log(`➕ Creating Site: "${mapping.siteName}"`);
        site = new Site({
          name: mapping.siteName,
          location: mapping.siteName,
          startDate: new Date(`${targetYear}-01-01`),
          endDate: new Date(`${targetYear + 2}-12-31`),
          status: 'active',
          createdBy: admin._id,
          isActive: true
        });
        await site.save();
      }

      const wb = xlsx.readFile(filePath);
      const sheetName = wb.SheetNames[0];
      const rawData = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });

      let dayHeaderRowIdx = -1;
      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        if (row && (row.includes(1) || row.includes("1"))) {
          dayHeaderRowIdx = i;
          break;
        }
      }

      if (dayHeaderRowIdx === -1) {
        console.error(`❌ Could not locate day column headers in ${path.basename(filePath)}`);
        continue;
      }

      const headerRow = rawData[dayHeaderRowIdx];
      const colToDayMap = {};
      headerRow.forEach((cellVal, colIdx) => {
        const parsedDay = parseInt(cellVal, 10);
        if (!isNaN(parsedDay) && parsedDay >= 1 && parsedDay <= 31) {
          colToDayMap[colIdx] = parsedDay;
        }
      });

      const workerRows = rawData.slice(dayHeaderRowIdx + 1);

      for (const row of workerRows) {
        if (!row || !row[1]) continue;
        const workerName = String(row[1]).trim();
        if (isIgnoredWorker(workerName)) continue;

        const nameKey = workerName.toLowerCase();
        let emp = empMapByName.get(nameKey);

        if (!emp) {
          emp = new Employee({
            name: workerName,
            email: '',
            mobile: '',
            address: 'Not Provided',
            managerId: manager._id,
            shift: 'morning',
            isCreatedByAdmin: true,
            createdBy: admin._id,
            siteId: site._id
          });
          await emp.save();
          empMapByName.set(nameKey, emp);
          totalEmployeesCreated++;
          console.log(`   ➕ Created Employee: "${workerName}"`);
        } else {
          if (!emp.siteId || emp.siteId.toString() !== site._id.toString()) {
            emp.siteId = site._id;
            await emp.save();
            totalEmployeesUpdated++;
            console.log(`   🔄 Linked Employee: "${workerName}" -> Site`);
          }
        }

        // Build attendance docs
        for (const [colIdx, dayNum] of Object.entries(colToDayMap)) {
          const val = row[colIdx];
          if (!val) continue;

          const cellStr = String(val).trim().toUpperCase();
          if (cellStr === 'P' || cellStr === 'PRESENT' || cellStr === '1') {
            const formattedDay = String(dayNum).padStart(2, '0');
            const formattedMonth = String(targetMonth).padStart(2, '0');
            const dateStr = `${targetYear}-${formattedMonth}-${formattedDay}`;

            const attKey = `${emp._id.toString()}_${dateStr}`;
            if (existingAttKeys.has(attKey)) {
              totalAttendanceSkipped++;
              continue;
            }

            // Calculate realistic randomized shift timings
            const empShift = (emp.shift || 'morning').toLowerCase();
            const randMin = String(Math.floor(Math.random() * 31)).padStart(2, '0');
            const randSec = String(Math.floor(Math.random() * 60)).padStart(2, '0');

            let stepInStr = '';
            if (empShift === 'morning') {
              // 07:00 AM to 07:30 AM
              stepInStr = `${dateStr}T07:${randMin}:${randSec}+05:30`;
            } else if (empShift === 'evening') {
              // 03:00 PM to 03:30 PM
              stepInStr = `${dateStr}T15:${randMin}:${randSec}+05:30`;
            } else if (empShift === 'night') {
              // 11:00 PM to 11:30 PM
              stepInStr = `${dateStr}T23:${randMin}:${randSec}+05:30`;
            } else {
              stepInStr = `${dateStr}T07:${randMin}:${randSec}+05:30`;
            }

            const stepInDate = new Date(stepInStr);
            const stepOutDate = new Date(stepInDate.getTime() + 8 * 3600 * 1000);

            newAttendanceDocs.push({
              employeeId: emp._id,
              managerId: emp.managerId || manager._id,
              siteId: site._id,
              shift: empShift,
              stepIn: stepInDate,
              stepOut: stepOutDate,
              totalTime: 480,
              address: site.name,
              note: `Seeded attendance for ${targetMonthName} ${targetYear}`
            });

            existingAttKeys.add(attKey);
          }
        }
      }
    }

    if (newAttendanceDocs.length > 0) {
      console.log(`\n⚡ Bulk inserting ${newAttendanceDocs.length} attendance records...`);
      await Attendance.insertMany(newAttendanceDocs, { ordered: false });
      totalAttendanceInserted = newAttendanceDocs.length;
    }

    console.log(`\n===============================================================`);
    console.log(`🎉 SEEDING COMPLETED FOR ${targetMonthName.toUpperCase()} ${targetYear}`);
    console.log(`===============================================================`);
    console.log(`🆕 New Employees Created: ${totalEmployeesCreated}`);
    console.log(`🔄 Employees Linked to Site: ${totalEmployeesUpdated}`);
    console.log(`✅ Attendance Records Inserted: ${totalAttendanceInserted}`);
    console.log(`⏭️ Attendance Records Skipped (Already Exist): ${totalAttendanceSkipped}`);
    console.log(`===============================================================\n`);

    await mongoose.disconnect();
    console.log('✅ Connection closed.');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
};

seedAttendance();
