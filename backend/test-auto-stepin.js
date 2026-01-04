import mongoose from 'mongoose';
import Attendance from './models/attendence.models.js';
import Employee from './models/employee.models.js';
import { autoStepIn } from './controller/cron.controller.js';
import { getCurrentISTTime, getCurrentISTHour } from './utils/timeUtils.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Safety check: Detect database type
const checkDatabaseSafety = () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/labor-management';
  
  // Check if it's a cloud MongoDB (production)
  const isCloudDB = mongoUri.includes('mongodb+srv://') || 
                    mongoUri.includes('mongodb.net') ||
                    mongoUri.includes('atlas');
  
  // Check if it's local MongoDB
  const isLocalDB = mongoUri.includes('localhost') || 
                    mongoUri.includes('127.0.0.1') ||
                    mongoUri.startsWith('mongodb://localhost');
  
  // Extract database name for display
  let dbName = 'Unknown';
  try {
    if (mongoUri.includes('mongodb+srv://')) {
      const match = mongoUri.match(/mongodb\+srv:\/\/[^/]+\/([^?]+)/);
      dbName = match ? match[1] : 'Unknown';
    } else if (mongoUri.includes('mongodb://')) {
      const match = mongoUri.match(/mongodb:\/\/[^/]+\/([^?]+)/);
      dbName = match ? match[1] : 'Unknown';
    }
  } catch (e) {
    // Ignore parsing errors
  }
  
  return {
    uri: mongoUri,
    isCloudDB,
    isLocalDB,
    dbName,
    isProduction: isCloudDB || process.env.NODE_ENV === 'production'
  };
};

// Database connection with safety checks
const connectDB = async () => {
  const dbInfo = checkDatabaseSafety();
  
  console.log('\n' + '='.repeat(60));
  console.log('🔍 DATABASE CONNECTION CHECK');
  console.log('='.repeat(60));
  console.log(`📊 Database Type: ${dbInfo.isCloudDB ? '☁️  CLOUD (MongoDB Atlas)' : dbInfo.isLocalDB ? '💻 LOCAL' : '❓ UNKNOWN'}`);
  console.log(`📝 Database Name: ${dbInfo.dbName}`);
  console.log(`🌐 Connection: ${dbInfo.isCloudDB ? 'Production/Cloud' : 'Local'}`);
  
  // Show masked URI (hide credentials)
  const maskedUri = dbInfo.uri.replace(/mongodb\+srv:\/\/[^:]+:[^@]+@/, 'mongodb+srv://***:***@')
                                .replace(/mongodb:\/\/[^:]+:[^@]+@/, 'mongodb://***:***@');
  console.log(`🔗 URI: ${maskedUri}`);
  
  if (dbInfo.isProduction) {
    console.log('\n⚠️  WARNING: You are connecting to a PRODUCTION/CLOUD database!');
    console.log('⚠️  This test will modify real data!');
    console.log('\n🛑 To use LOCAL database:');
    console.log('   1. Set MONGODB_URI=mongodb://localhost:27017/labor-management in .env');
    console.log('   2. Or use: mongodb://127.0.0.1:27017/labor-management');
    console.log('\n💡 For safety, this script will exit.');
    console.log('   If you really want to test on production, set FORCE_PRODUCTION=true');
    
    if (process.env.FORCE_PRODUCTION !== 'true') {
      console.log('\n❌ Exiting for safety...');
      process.exit(1);
    } else {
      console.log('\n⚠️  FORCE_PRODUCTION=true detected. Proceeding with caution...');
    }
  } else {
    console.log('\n✅ Safe to proceed - Local database detected');
  }
  
  console.log('='.repeat(60) + '\n');
  
  try {
    await mongoose.connect(dbInfo.uri);
    console.log('✅ Connected to MongoDB');
    
    // Show actual database name after connection
    const db = mongoose.connection.db;
    if (db) {
      console.log(`📊 Connected to database: ${db.databaseName}`);
    }
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
};

// Test function
const testAutoStepIn = async (forceShift = null) => {
  await connectDB();
  
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TESTING AUTO STEP-IN FUNCTION');
  console.log('='.repeat(60));
  
  // Get current time
  const now = getCurrentISTTime();
  const currentHour = getCurrentISTHour();
  
  console.log('\n📅 Current Time (IST):', now.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'}));
  console.log('⏰ Current Hour (IST):', currentHour);
  
  // Define shift start times
  const shiftStartTimes = {
    7: 'morning',   // 7 AM
    15: 'evening',  // 3 PM
    23: 'night'     // 11 PM
  };
  
  // Determine which shift to test
  let testShift = forceShift;
  if (!testShift) {
    testShift = shiftStartTimes[currentHour];
  }
  
  if (!testShift) {
    console.log('\n⚠️  Current hour is not a shift start time.');
    console.log('💡 Shift start times: 7 AM (morning), 3 PM (evening), 11 PM (night)');
    console.log('💡 You can force a shift by passing: morning, evening, or night');
    console.log('\n📋 Available shifts to test:');
    Object.entries(shiftStartTimes).forEach(([hour, shift]) => {
      console.log(`   - ${shift} (${hour}:00)`);
    });
    await mongoose.disconnect();
    return;
  }
  
  console.log(`\n🎯 Testing for: ${testShift.toUpperCase()} shift`);
  
  // Get employees for this shift
  const employeesForShift = await Employee.find({
    shift: testShift
  }).populate('managerId', 'name');
  
  console.log(`\n👥 Total employees assigned to ${testShift} shift: ${employeesForShift.length}`);
  
  if (employeesForShift.length === 0) {
    console.log('⚠️  No employees found for this shift. Please create employees with this shift first.');
    await mongoose.disconnect();
    return;
  }
  
  // Show employee details
  employeesForShift.forEach((emp, index) => {
    console.log(`   ${index + 1}. ${emp.name} (ID: ${emp._id}) - isWorking: ${emp.isWorking}`);
  });
  
  // Check current state - employees who are working
  const workingEmployees = await Employee.find({
    shift: testShift,
    isWorking: true
  });
  
  console.log(`\n✅ Currently working employees: ${workingEmployees.length}`);
  workingEmployees.forEach(emp => {
    console.log(`   - ${emp.name}`);
  });
  
  // Check current state - employees who are NOT working
  const notWorkingEmployees = await Employee.find({
    shift: testShift,
    isWorking: false
  });
  
  console.log(`\n❌ Not working employees: ${notWorkingEmployees.length}`);
  notWorkingEmployees.forEach(emp => {
    console.log(`   - ${emp.name}`);
  });
  
  // Check for open attendance records
  const openAttendanceRecords = await Attendance.find({
    stepOut: null
  }).populate('employeeId', 'name shift');
  
  console.log(`\n📋 Open attendance records (all shifts): ${openAttendanceRecords.length}`);
  openAttendanceRecords.forEach(record => {
    const clockInTime = new Date(record.stepIn).toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'});
    console.log(`   - ${record.employeeId.name} (${record.employeeId.shift}): Clocked in at ${clockInTime}`);
  });
  
  // Check employees who should be auto-stepped-in
  const employeesToStepIn = [];
  for (const employee of notWorkingEmployees) {
    // Check if employee has open attendance
    const openAttendance = await Attendance.findOne({
      employeeId: employee._id,
      stepOut: null
    });
    
    if (openAttendance) {
      console.log(`\n⚠️  ${employee.name} already has open attendance. Will be skipped.`);
      continue;
    }
    
    // Check if already auto-stepped-in today
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    const todayAttendance = await Attendance.findOne({
      employeeId: employee._id,
      shift: testShift,
      stepIn: { $gte: todayStart },
      note: { $regex: /Auto stepped in/i }
    });
    
    if (todayAttendance) {
      console.log(`\n⚠️  ${employee.name} already auto-stepped-in today for ${testShift} shift. Will be skipped.`);
      continue;
    }
    
    employeesToStepIn.push(employee);
  }
  
  console.log(`\n🎯 Employees that will be auto-stepped-in: ${employeesToStepIn.length}`);
  employeesToStepIn.forEach(emp => {
    console.log(`   - ${emp.name} (Manager: ${emp.managerId?.name || 'N/A'})`);
  });
  
  // Run the auto step-in function
  console.log('\n' + '='.repeat(60));
  console.log('🚀 RUNNING AUTO STEP-IN FUNCTION');
  console.log('='.repeat(60));
  
  // Temporarily modify the function to test with forced shift
  const originalAutoStepIn = autoStepIn;
  
  // Create a test version that forces the shift
  const testAutoStepInFunction = async () => {
    console.log("Running auto-step-in check...");
    
    const now = getCurrentISTTime();
    const currentHour = forceShift ? 
      (testShift === 'morning' ? 7 : testShift === 'evening' ? 15 : 23) : 
      getCurrentISTHour();
    
    const shiftStartTimes = {
      7: 'morning',
      15: 'evening',
      23: 'night'
    };
    
    const currentShift = shiftStartTimes[currentHour] || testShift;
    
    if (!currentShift) {
      console.log(`Current hour (${currentHour}) is not a shift start time. Skipping auto step-in.`);
      return;
    }
    
    console.log(`Shift start detected: ${currentShift} shift at ${currentHour}:00`);
    
    const randomLocations = [
      "Gujari bajar",
      "Dhobi Ghat",
      "Khodiyar nagar parking",
      "Subhash Bridge"
    ];
    
    try {
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      
      const employees = await Employee.find({
        shift: currentShift,
        isWorking: false
      });
      
      console.log(`Found ${employees.length} employees for ${currentShift} shift`);
      
      let steppedInCount = 0;
      let skippedCount = 0;
      
      for (const employee of employees) {
        try {
          const openAttendance = await Attendance.findOne({
            employeeId: employee._id,
            stepOut: null
          });
          
          if (openAttendance) {
            console.log(`Employee ${employee.name} (${employee._id}) already has open attendance. Skipping.`);
            skippedCount++;
            continue;
          }
          
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
          
          const randomLocation = randomLocations[Math.floor(Math.random() * randomLocations.length)];
          
          const stepIn = getCurrentISTTime();
          const attendance = new Attendance({
            employeeId: employee._id,
            managerId: employee.managerId,
            stepIn,
            stepInImage: null,
            stepInLongitude: 0,
            stepInLatitude: 0,
            stepInAddress: randomLocation,
            longitude: 0,
            latitude: 0,
            address: randomLocation,
            note: `Auto stepped in for ${currentShift} shift`,
            shift: currentShift
          });
          
          await attendance.save();
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
  };
  
  await testAutoStepInFunction();
  
  // Check results after auto step-in
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESULTS AFTER AUTO STEP-IN');
  console.log('='.repeat(60));
  
  // Check newly created attendance records
  const recentlySteppedIn = await Attendance.find({
    stepIn: { $gte: new Date(now.getTime() - 5 * 60 * 1000) }, // Last 5 minutes
    note: { $regex: /Auto stepped in/i }
  })
  .populate('employeeId', 'name shift')
  .populate('managerId', 'name');
  
  console.log(`\n✅ Recently Auto-Stepped-In (Last 5 minutes): ${recentlySteppedIn.length}`);
  recentlySteppedIn.forEach(record => {
    const stepInTime = new Date(record.stepIn).toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'});
    console.log(`   - ${record.employeeId.name} (${record.employeeId.shift}):`);
    console.log(`     Step In: ${stepInTime}`);
    console.log(`     Location: ${record.stepInAddress || record.address}`);
    console.log(`     Manager: ${record.managerId?.name || 'N/A'}`);
    console.log(`     Note: ${record.note}`);
  });
  
  // Check updated employee status
  const updatedEmployees = await Employee.find({
    shift: testShift,
    isWorking: true
  });
  
  console.log(`\n👥 Employees now working (${testShift} shift): ${updatedEmployees.length}`);
  updatedEmployees.forEach(emp => {
    console.log(`   - ${emp.name}`);
  });
  
  // Check open attendance records
  const newOpenRecords = await Attendance.find({
    stepOut: null
  }).populate('employeeId', 'name shift');
  
  console.log(`\n📋 Open attendance records (all shifts): ${newOpenRecords.length}`);
  newOpenRecords.forEach(record => {
    const clockInTime = new Date(record.stepIn).toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'});
    const isAuto = record.note?.includes('Auto stepped in');
    console.log(`   - ${record.employeeId.name} (${record.employeeId.shift}): ${clockInTime} ${isAuto ? '🤖 [AUTO]' : ''}`);
  });
  
  await mongoose.disconnect();
  console.log('\n' + '='.repeat(60));
  console.log('✅ TEST COMPLETED!');
  console.log('='.repeat(60));
  console.log('\n💡 To test other shifts, run:');
  console.log('   node server/test-auto-stepin.js morning');
  console.log('   node server/test-auto-stepin.js evening');
  console.log('   node server/test-auto-stepin.js night');
};

// Get shift from command line argument
const shiftArg = process.argv[2];
const validShifts = ['morning', 'evening', 'night'];
const forceShift = shiftArg && validShifts.includes(shiftArg.toLowerCase()) ? shiftArg.toLowerCase() : null;

if (forceShift) {
  console.log(`\n🔧 Force testing ${forceShift} shift (ignoring current time)`);
}

// Run the test
testAutoStepIn(forceShift).catch(console.error);

