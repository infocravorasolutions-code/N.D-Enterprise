import mongoose from 'mongoose';
import Attendance from './models/attendence.models.js';
import Employee from './models/employee.models.js';
import Manager from './models/manager.models.js';
import { getCurrentISTTime } from './utils/timeUtils.js';
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
    console.log('⚠️  This script will MODIFY/DELETE real data!');
    console.log('\n🛑 To use LOCAL database:');
    console.log('   1. Set MONGODB_URI=mongodb://localhost:27017/labor-management in .env');
    console.log('   2. Or use: mongodb://127.0.0.1:27017/labor-management');
    console.log('\n💡 For safety, this script will exit.');
    console.log('   If you really want to run on production, set FORCE_PRODUCTION=true');
    
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

// Prepare test data for auto step-in testing
const prepareTestData = async () => {
  await connectDB();
  
  console.log('\n' + '='.repeat(60));
  console.log('🔧 PREPARING TEST DATA FOR AUTO STEP-IN');
  console.log('='.repeat(60));
  
  // Get a manager (or create one if none exists)
  let manager = await Manager.findOne();
  if (!manager) {
    console.log('⚠️  No manager found. Please create a manager first.');
    await mongoose.disconnect();
    return;
  }
  
  console.log(`\n👤 Using manager: ${manager.name} (ID: ${manager._id})`);
  
  // Get current time
  const now = getCurrentISTTime();
  
  // Check existing employees by shift
  const morningEmployees = await Employee.find({ shift: 'morning' });
  const eveningEmployees = await Employee.find({ shift: 'evening' });
  const nightEmployees = await Employee.find({ shift: 'night' });
  
  console.log('\n📊 Current Employee Status:');
  console.log(`   Morning shift: ${morningEmployees.length} employees`);
  console.log(`   Evening shift: ${eveningEmployees.length} employees`);
  console.log(`   Night shift: ${nightEmployees.length} employees`);
  
  // Step out all currently working employees to prepare for testing
  console.log('\n🔄 Preparing employees for testing...');
  
  const workingEmployees = await Employee.find({ isWorking: true });
  console.log(`\n📋 Found ${workingEmployees.length} working employees`);
  
  // Step out all working employees
  for (const employee of workingEmployees) {
    const openAttendance = await Attendance.findOne({
      employeeId: employee._id,
      stepOut: null
    });
    
    if (openAttendance) {
      const stepOutTime = getCurrentISTTime();
      const totalTime = Math.round((stepOutTime - openAttendance.stepIn) / 60000);
      
      openAttendance.stepOut = stepOutTime;
      openAttendance.totalTime = totalTime;
      openAttendance.note = openAttendance.note || 'Stepped out for testing';
      await openAttendance.save();
      
      await Employee.findByIdAndUpdate(employee._id, { isWorking: false });
      console.log(`   ✅ Stepped out: ${employee.name}`);
    }
  }
  
  // Delete today's auto step-in records to allow re-testing
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  
  const autoStepInRecords = await Attendance.find({
    stepIn: { $gte: todayStart },
    note: { $regex: /Auto stepped in/i }
  });
  
  console.log(`\n🗑️  Found ${autoStepInRecords.length} auto step-in records from today`);
  
  if (autoStepInRecords.length > 0) {
    console.log('   Deleting today\'s auto step-in records to allow re-testing...');
    for (const record of autoStepInRecords) {
      await Employee.findByIdAndUpdate(record.employeeId, { isWorking: false });
      await Attendance.findByIdAndDelete(record._id);
      console.log(`   ✅ Deleted auto step-in record for employee: ${record.employeeId}`);
    }
  }
  
  // Show final status
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL STATUS');
  console.log('='.repeat(60));
  
  const finalMorning = await Employee.find({ shift: 'morning', isWorking: false });
  const finalEvening = await Employee.find({ shift: 'evening', isWorking: false });
  const finalNight = await Employee.find({ shift: 'night', isWorking: false });
  
  console.log(`\n✅ Ready for testing:`);
  console.log(`   Morning shift: ${finalMorning.length} employees ready (not working)`);
  console.log(`   Evening shift: ${finalEvening.length} employees ready (not working)`);
  console.log(`   Night shift: ${finalNight.length} employees ready (not working)`);
  
  if (finalMorning.length === 0 && finalEvening.length === 0 && finalNight.length === 0) {
    console.log('\n⚠️  WARNING: No employees are ready for testing!');
    console.log('💡 Make sure you have employees assigned to shifts and they are not currently working.');
  } else {
    console.log('\n✅ Test data prepared successfully!');
    console.log('\n💡 Now you can run the test:');
    console.log('   node server/test-auto-stepin.js morning');
    console.log('   node server/test-auto-stepin.js evening');
    console.log('   node server/test-auto-stepin.js night');
  }
  
  await mongoose.disconnect();
  console.log('\n' + '='.repeat(60));
};

// Run the function
prepareTestData().catch(console.error);

