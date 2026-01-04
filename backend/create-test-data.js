import mongoose from 'mongoose';
import Attendance from './models/attendence.models.js';
import Employee from './models/employee.models.js';
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

// Create test data
const createTestData = async () => {
  await connectDB();
  
  console.log('\n=== Creating Test Data ===');
  
  // Get a test employee
  const testEmployee = await Employee.findOne();
  if (!testEmployee) {
    console.log('No employees found. Please create an employee first.');
    return;
  }
  
  console.log(`Using test employee: ${testEmployee.name}`);
  
  // Create test attendance records
  const now = getCurrentISTTime();
  
  // Test 1: Employee clocked in 9 hours ago (should be auto clocked out)
  const nineHoursAgo = getHoursAgoInIST(9);
  const testRecord1 = new Attendance({
    employeeId: testEmployee._id,
    managerId: testEmployee.createdBy,
    stepIn: nineHoursAgo,
    stepInImage: 'test-image.jpg',
    longitude: 72.8777,
    latitude: 19.0760,
    address: 'Test Location',
    note: 'Test record - 9 hours ago',
    shift: 'morning'
  });
  
  // Test 2: Employee clocked in 5 hours ago (should NOT be auto clocked out)
  const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  const testRecord2 = new Attendance({
    employeeId: testEmployee._id,
    managerId: testEmployee.createdBy,
    stepIn: fiveHoursAgo,
    stepInImage: 'test-image2.jpg',
    longitude: 72.8777,
    latitude: 19.0760,
    address: 'Test Location 2',
    note: 'Test record - 5 hours ago',
    shift: 'evening'
  });
  
  // Save test records
  await testRecord1.save();
  await testRecord2.save();
  
  console.log('Test records created:');
  console.log(`1. Employee clocked in 9 hours ago: ${nineHoursAgo.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}`);
  console.log(`2. Employee clocked in 5 hours ago: ${fiveHoursAgo.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}`);
  
  await mongoose.disconnect();
  console.log('\nTest data created successfully!');
};

// Run the function
createTestData().catch(console.error);
