import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from './models/employee.models.js';

// Load environment variables
dotenv.config();

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/labor-management');
    console.log('✅ Connected to MongoDB\n');
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
};

/**
 * Generate random email from name
 */
const generateEmail = (name) => {
  // Clean name: remove spaces, special chars, convert to lowercase
  const cleanName = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 15); // Limit length
  
  // Random number suffix
  const randomNum = Math.floor(Math.random() * 10000);
  
  // Common email domains
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'company.com'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  
  return `${cleanName}${randomNum}@${domain}`;
};

/**
 * Generate random Indian mobile number
 */
const generateMobile = () => {
  // Indian mobile numbers start with 6, 7, 8, or 9
  const firstDigit = [6, 7, 8, 9][Math.floor(Math.random() * 4)];
  // Generate remaining 9 digits
  const remaining = Math.floor(100000000 + Math.random() * 900000000);
  return `${firstDigit}${remaining}`;
};

const addRandomEmailMobile = async () => {
  await connectDB();

  try {
    // Find all employees without email or mobile
    const employees = await Employee.find({
      $or: [
        { email: { $in: [null, ''] } },
        { mobile: { $in: [null, ''] } }
      ]
    });

    console.log(`📊 Found ${employees.length} employees to update\n`);

    if (employees.length === 0) {
      console.log('✅ All employees already have email and mobile numbers!');
      await mongoose.disconnect();
      return;
    }

    let updatedCount = 0;
    let errorCount = 0;

    console.log('🔄 Updating employees with random email and mobile...\n');

    for (let i = 0; i < employees.length; i++) {
      const employee = employees[i];
      
      try {
        const updates = {};
        
        // Generate email if missing
        if (!employee.email || employee.email.trim() === '') {
          updates.email = generateEmail(employee.name);
        }
        
        // Generate mobile if missing
        if (!employee.mobile || employee.mobile.trim() === '') {
          updates.mobile = generateMobile();
        }

        // Update employee
        await Employee.findByIdAndUpdate(employee._id, updates);
        updatedCount++;

        // Progress indicator
        if ((i + 1) % 100 === 0) {
          console.log(`✅ Updated ${i + 1}/${employees.length} employees...`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Error updating ${employee.name}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 UPDATE SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully updated: ${updatedCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`📋 Total processed: ${employees.length}\n`);

    // Verify
    const employeesWithoutEmail = await Employee.countDocuments({ 
      email: { $in: [null, ''] } 
    });
    const employeesWithoutMobile = await Employee.countDocuments({ 
      mobile: { $in: [null, ''] } 
    });

    console.log(`📊 Verification:`);
    console.log(`   Employees without email: ${employeesWithoutEmail}`);
    console.log(`   Employees without mobile: ${employeesWithoutMobile}\n`);

    // Show sample of updated employees
    const sampleEmployees = await Employee.find({
      email: { $ne: '' },
      mobile: { $ne: '' }
    })
    .limit(5)
    .select('name email mobile')
    .lean();

    console.log('📋 Sample updated employees:');
    sampleEmployees.forEach((emp, idx) => {
      console.log(`   ${idx + 1}. ${emp.name}`);
      console.log(`      Email: ${emp.email}`);
      console.log(`      Mobile: ${emp.mobile}`);
    });
    console.log('');

    if (updatedCount > 0) {
      console.log('✅ Update completed! All employees now have email and mobile numbers.\n');
    }

  } catch (error) {
    console.error('❌ Update failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
};

addRandomEmailMobile().catch(console.error);

