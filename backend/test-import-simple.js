import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from './models/employee.models.js';
import Manager from './models/manager.models.js';
import Admin from './models/admin.models.js';

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

const testImport = async () => {
  await connectDB();

  try {
    // Get the first available manager
    const manager = await Manager.findOne({ siteId: null });
    if (!manager) {
      console.error('❌ No manager found in database. Please create a manager first.');
      process.exit(1);
    }
    console.log(`✅ Using manager: ${manager.name} (${manager.email})\n`);

    // Get the first available admin (or use manager as admin)
    let admin = await Admin.findOne();
    if (!admin) {
      console.log('⚠️  No admin found, using manager as createdBy');
      admin = manager;
    } else {
      console.log(`✅ Using admin: ${admin.name} (${admin.email})\n`);
    }

    // Test employees from your list
    const testEmployees = [
      { name: 'JOSHNABEN RAVAT', shift: 'morning' },
      { name: 'LALITABEN RAVAT', shift: 'morning' },
      { name: 'GAJRABEN RAVAT', shift: 'evening' },
      { name: 'HETABEN RAVAT', shift: 'evening' },
      { name: 'MAMTABEN RAVAT', shift: 'night' },
    ];

    console.log(`📝 Importing ${testEmployees.length} test employees...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const empData of testEmployees) {
      try {
        // Check if employee already exists
        const existing = await Employee.findOne({ 
          name: { $regex: new RegExp(`^${empData.name}$`, 'i') }
        });

        if (existing) {
          console.log(`⏭️  Skipped: ${empData.name} (already exists)`);
          continue;
        }

        const employee = new Employee({
          name: empData.name,
          email: '',
          mobile: '',
          address: 'Not Provided',
          managerId: manager._id,
          shift: empData.shift,
          createdBy: admin._id,
          isCreatedByAdmin: false,
          siteId: null // Global employee
        });

        await employee.save();
        console.log(`✅ Created: ${empData.name} (${empData.shift} shift)`);
        successCount++;
      } catch (error) {
        console.error(`❌ Error creating ${empData.name}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST IMPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully imported: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log(`📋 Total processed: ${testEmployees.length}\n`);

    // Verify employees are in database
    const totalEmployees = await Employee.countDocuments();
    console.log(`📊 Total employees in database: ${totalEmployees}`);

    // Check what admin would see
    const adminView = await Employee.countDocuments({ siteId: null });
    console.log(`👁️  Employees visible to Admin: ${adminView} (siteId: null)`);

    // Check what manager would see
    const managerView = await Employee.countDocuments({ 
      managerId: manager._id,
      siteId: null 
    });
    console.log(`👁️  Employees visible to Manager (${manager.name}): ${managerView} (managerId match + siteId: null)\n`);

    if (successCount > 0) {
      console.log('✅ Test import successful! You can now:');
      console.log('   1. Refresh your frontend to see the employees');
      console.log('   2. Run the full import with your Excel file\n');
    }

  } catch (error) {
    console.error('❌ Test import failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
};

testImport().catch(console.error);

