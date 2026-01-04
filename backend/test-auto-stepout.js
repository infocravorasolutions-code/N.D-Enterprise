import mongoose from 'mongoose';
import Attendance from './models/attendence.models.js';
import Employee from './models/employee.models.js';
import { autoStepOut } from './controller/cron.controller.js';
import dotenv from 'dotenv';
import { getCurrentISTTime, getHoursAgoInIST } from './utils/timeUtils.js';

// Load environment variables
dotenv.config();

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/labor-management');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Test function
const testAutoStepOut = async () => {
  await connectDB();
  
  console.log('\n=== Testing Auto Step-Out ===');
  
  // Get current time
  const now = getCurrentISTTime();
  const eightHoursAgo = getHoursAgoInIST(8);
  
  console.log('Current Time:', now.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'}));
  console.log('Eight Hours Ago:', eightHoursAgo.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'}));
  
  // Check current active attendance records
  const activeRecords = await Attendance.find({
    stepOut: null
  }).populate('employeeId', 'name');
  
  console.log(`\nActive Attendance Records: ${activeRecords.length}`);
  activeRecords.forEach(record => {
    const clockInTime = new Date(record.stepIn).toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'});
    const hoursWorked = Math.round((now - record.stepIn) / (1000 * 60 * 60));
    console.log(`- ${record.employeeId.name}: Clocked in at ${clockInTime} (${hoursWorked} hours ago)`);
  });
  
  // Check records that should be auto clocked out
  const recordsToAutoClockOut = await Attendance.find({
    stepOut: null,
    stepIn: { $lte: eightHoursAgo }
  }).populate('employeeId', 'name');
  
  console.log(`\nRecords that should be auto clocked out: ${recordsToAutoClockOut.length}`);
  recordsToAutoClockOut.forEach(record => {
    const clockInTime = new Date(record.stepIn).toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'});
    const hoursWorked = Math.round((now - record.stepIn) / (1000 * 60 * 60));
    console.log(`- ${record.employeeId.name}: Clocked in at ${clockInTime} (${hoursWorked} hours ago)`);
  });
  
  // Run the auto step-out function
  console.log('\n=== Running Auto Step-Out Function ===');
  await autoStepOut();
  
  // Check results after auto step-out
  console.log('\n=== Results After Auto Step-Out ===');
  const remainingActiveRecords = await Attendance.find({
    stepOut: null
  }).populate('employeeId', 'name');
  
  console.log(`Remaining Active Records: ${remainingActiveRecords.length}`);
  remainingActiveRecords.forEach(record => {
    const clockInTime = new Date(record.stepIn).toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'});
    const hoursWorked = Math.round((now - record.stepIn) / (1000 * 60 * 60));
    console.log(`- ${record.employeeId.name}: Clocked in at ${clockInTime} (${hoursWorked} hours ago)`);
  });
  
  // Check recently clocked out records
  const recentlyClockOut = await Attendance.find({
    stepOut: { $exists: true },
    stepOut: { $gte: new Date(now.getTime() - 5 * 60 * 1000) } // Last 5 minutes
  }).populate('employeeId', 'name');
  
  console.log(`\nRecently Clocked Out (Last 5 minutes): ${recentlyClockOut.length}`);
  recentlyClockOut.forEach(record => {
    const clockInTime = new Date(record.stepIn).toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'});
    const clockOutTime = new Date(record.stepOut).toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'});
    console.log(`- ${record.employeeId.name}: ${clockInTime} → ${clockOutTime} (${record.totalTime} minutes)`);
  });
  
  await mongoose.disconnect();
  console.log('\nTest completed!');
};

// Run the test
testAutoStepOut().catch(console.error);
