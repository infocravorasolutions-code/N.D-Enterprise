import mongoose from 'mongoose';
import XLSX from 'xlsx';
import dotenv from 'dotenv';
import Employee from './models/employee.models.js';
import Manager from './models/manager.models.js';
import Admin from './models/admin.models.js';
import Site from './models/site.models.js';
import path from 'path';
import { fileURLToPath } from 'url';

// ES6 module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/labor-management');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
};

/**
 * Find manager by email or name
 */
const findManager = async (managerIdentifier) => {
  if (!managerIdentifier) return null;
  
  // Try by email first
  let manager = await Manager.findOne({ email: managerIdentifier.trim() });
  
  // If not found, try by name
  if (!manager) {
    manager = await Manager.findOne({ name: { $regex: new RegExp(managerIdentifier.trim(), 'i') } });
  }
  
  return manager;
};

/**
 * Find admin by email or name
 */
const findAdmin = async (adminIdentifier) => {
  if (!adminIdentifier) return null;
  
  // Try by email first
  let admin = await Admin.findOne({ email: adminIdentifier.trim() });
  
  // If not found, try by name
  if (!admin) {
    admin = await Admin.findOne({ name: { $regex: new RegExp(adminIdentifier.trim(), 'i') } });
  }
  
  return admin;
};

/**
 * Find site by name
 */
const findSite = async (siteName) => {
  if (!siteName) return null;
  
  const site = await Site.findOne({ 
    name: { $regex: new RegExp(siteName.trim(), 'i') },
    isActive: true 
  });
  
  return site;
};

/**
 * Normalize shift value
 */
const normalizeShift = (shift) => {
  if (!shift) return null;
  
  const shiftLower = shift.toString().toLowerCase().trim();
  
  if (shiftLower.includes('morning') || shiftLower === 'm') {
    return 'morning';
  } else if (shiftLower.includes('evening') || shiftLower === 'e') {
    return 'evening';
  } else if (shiftLower.includes('night') || shiftLower === 'n') {
    return 'night';
  }
  
  return null;
};

/**
 * Import employees from Excel file
 */
const importEmployees = async (filePath, options = {}) => {
  const {
    defaultManagerEmail = null,
    defaultAdminEmail = null,
    defaultSiteName = null,
    defaultShift = 'morning',
    defaultAddress = 'Not Provided',
    isCreatedByAdmin = false,
    skipDuplicates = true
  } = options;

  console.log('\n📊 Starting Excel Import...\n');
  console.log('Options:', {
    defaultManagerEmail,
    defaultAdminEmail,
    defaultSiteName,
    defaultShift,
    defaultAddress,
    isCreatedByAdmin,
    skipDuplicates
  });

  // Read Excel file
  let workbook;
  try {
    workbook = XLSX.readFile(filePath);
  } catch (error) {
    console.error('❌ Error reading Excel file:', error.message);
    process.exit(1);
  }

  // Get first sheet
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  if (data.length === 0) {
    console.log('⚠️  No data found in Excel file');
    return;
  }

  console.log(`\n📋 Found ${data.length} rows in Excel file`);
  console.log('Sample row:', data[0]);
  console.log('\n');

  // Get default manager and admin if provided
  let defaultManager = null;
  let defaultAdmin = null;
  let defaultSite = null;

  if (defaultManagerEmail) {
    defaultManager = await findManager(defaultManagerEmail);
    if (!defaultManager) {
      console.error(`❌ Default manager not found: ${defaultManagerEmail}`);
      process.exit(1);
    }
    console.log(`✅ Using default manager: ${defaultManager.name} (${defaultManager.email})`);
  }

  if (defaultAdminEmail) {
    defaultAdmin = await findAdmin(defaultAdminEmail);
    if (!defaultAdmin) {
      console.error(`❌ Default admin not found: ${defaultAdminEmail}`);
      process.exit(1);
    }
    console.log(`✅ Using default admin: ${defaultAdmin.name} (${defaultAdmin.email})`);
  }

  if (defaultSiteName) {
    defaultSite = await findSite(defaultSiteName);
    if (!defaultSite) {
      console.error(`❌ Default site not found: ${defaultSiteName}`);
      process.exit(1);
    }
    console.log(`✅ Using default site: ${defaultSite.name}`);
  }

  // Process each row
  const results = {
    success: [],
    failed: [],
    skipped: []
  };

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 2; // +2 because Excel rows start at 1 and we have a header

    try {
      // Map Excel columns to employee fields
      // Flexible column mapping - supports various column name variations
      // Handle "No." column - ignore it (it will be in the row but we don't use it)
      const name = row['Name'] || row['name'] || row['NAME'] || row['Employee Name'] || row['Full Name'] || 
                   row['Employee'] || row['EMPLOYEE'];
      const email = row['Email'] || row['email'] || row['EMAIL'] || row['Email Address'] || '';
      const mobile = row['Mobile'] || row['mobile'] || row['MOBILE'] || row['Phone'] || row['phone'] || row['Contact'] || '';
      const address = row['Address'] || row['address'] || row['ADDRESS'] || row['Location'] || row['location'] || defaultAddress;
      const shift = row['Shift'] || row['shift'] || row['SHIFT'] || row['Shift Type'] || row['shift_type'] || defaultShift;
      const managerEmail = row['Manager Email'] || row['manager_email'] || row['Manager'] || row['manager'] || row['Manager Email'] || row['ManagerEmail'];
      const adminEmail = row['Admin Email'] || row['admin_email'] || row['Created By'] || row['created_by'] || row['Admin'] || row['admin'];
      const siteName = row['Site'] || row['site'] || row['SITE'] || row['Site Name'] || row['site_name'] || row['SiteName'];

      // Validate required fields
      if (!name || name.toString().trim() === '') {
        results.failed.push({ row: rowNum, reason: 'Missing required field: Name', data: row });
        console.log(`❌ Row ${rowNum}: Missing name`);
        continue;
      }

      // Use default address if not provided
      const finalAddress = address && address.toString().trim() !== '' ? address.toString().trim() : defaultAddress;

      // Normalize shift - use default if not provided or invalid
      let normalizedShift = normalizeShift(shift);
      if (!normalizedShift) {
        normalizedShift = normalizeShift(defaultShift);
        if (!normalizedShift) {
          normalizedShift = 'morning'; // Final fallback
        }
        console.log(`⚠️  Row ${rowNum}: Using default shift: ${normalizedShift}`);
      }

      // Find manager
      let manager = defaultManager;
      if (managerEmail && !manager) {
        manager = await findManager(managerEmail);
        if (!manager) {
          results.failed.push({ row: rowNum, reason: `Manager not found: ${managerEmail}`, data: row });
          console.log(`❌ Row ${rowNum}: Manager not found: ${managerEmail}`);
          continue;
        }
      }

      if (!manager) {
        results.failed.push({ row: rowNum, reason: 'No manager specified and no default manager provided', data: row });
        console.log(`❌ Row ${rowNum}: No manager found`);
        continue;
      }

      // Find admin/createdBy
      let createdBy = defaultAdmin;
      if (adminEmail && !createdBy) {
        createdBy = await findAdmin(adminEmail);
        if (!createdBy) {
          // If admin not found, use manager as createdBy
          createdBy = manager;
          console.log(`⚠️  Row ${rowNum}: Admin not found, using manager as createdBy`);
        }
      }

      if (!createdBy) {
        // Fallback to manager if no admin specified
        createdBy = manager;
      }

      // Find site (optional)
      let siteId = defaultSite ? defaultSite._id : null;
      if (siteName && !siteId) {
        const site = await findSite(siteName);
        if (site) {
          siteId = site._id;
        } else {
          console.log(`⚠️  Row ${rowNum}: Site not found: ${siteName}, using null (global employee)`);
        }
      }

      // Check for duplicates
      if (skipDuplicates) {
        let existingEmployee = null;
        
        // Check by email if provided
        if (email && email.trim() !== '') {
          existingEmployee = await Employee.findOne({ email: email.trim() });
          if (existingEmployee) {
            results.skipped.push({ row: rowNum, reason: `Duplicate email: ${email}`, data: row });
            console.log(`⏭️  Row ${rowNum}: Skipped (duplicate email: ${email})`);
            continue;
          }
        }
        
        // Check by name if no email (to avoid exact name duplicates)
        if (!email || email.trim() === '') {
          existingEmployee = await Employee.findOne({ 
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
            email: '' // Only check if email is also empty
          });
          if (existingEmployee) {
            results.skipped.push({ row: rowNum, reason: `Duplicate name (no email): ${name}`, data: row });
            console.log(`⏭️  Row ${rowNum}: Skipped (duplicate name: ${name})`);
            continue;
          }
        }
      }

      // Create employee
      const employeeData = {
        name: name.toString().trim(),
        email: email && email.toString().trim() !== '' ? email.toString().trim() : '',
        mobile: mobile && mobile.toString().trim() !== '' ? mobile.toString().trim() : '',
        address: finalAddress,
        managerId: manager._id,
        shift: normalizedShift,
        createdBy: createdBy._id,
        isCreatedByAdmin: isCreatedByAdmin,
        siteId: siteId
      };

      const newEmployee = new Employee(employeeData);
      await newEmployee.save();

      results.success.push({ row: rowNum, employee: newEmployee });
      console.log(`✅ Row ${rowNum}: Created employee "${name.toString().trim()}" (${email && email.toString().trim() ? email.toString().trim() : 'no email'})`);

    } catch (error) {
      results.failed.push({ row: rowNum, reason: error.message, data: row });
      console.log(`❌ Row ${rowNum}: Error - ${error.message}`);
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successfully imported: ${results.success.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⏭️  Skipped: ${results.skipped.length}`);
  console.log(`📋 Total processed: ${data.length}`);

  if (results.failed.length > 0) {
    console.log('\n❌ Failed rows:');
    results.failed.forEach(({ row, reason }) => {
      console.log(`   Row ${row}: ${reason}`);
    });
  }

  if (results.skipped.length > 0) {
    console.log('\n⏭️  Skipped rows:');
    results.skipped.forEach(({ row, reason }) => {
      console.log(`   Row ${row}: ${reason}`);
    });
  }

  return results;
};

// Main execution
const main = async () => {
  await connectDB();

  // Get file path from command line arguments
  const filePath = process.argv[2];

  if (!filePath) {
    console.log('📝 Usage: node import-employees-from-excel.js <excel-file-path> [options]');
    console.log('\nOptions:');
    console.log('  --default-manager <email>     Default manager email/name for all employees (REQUIRED)');
    console.log('  --default-admin <email>       Default admin email/name for createdBy');
    console.log('  --default-site <name>         Default site name for all employees');
    console.log('  --default-shift <shift>       Default shift: morning/evening/night (default: morning)');
    console.log('  --default-address <address>   Default address if not in Excel (default: "Not Provided")');
    console.log('  --created-by-admin            Set isCreatedByAdmin to true (default: false)');
    console.log('  --allow-duplicates            Allow duplicate emails/names (default: skip duplicates)');
    console.log('\nExample:');
    console.log('  node import-employees-from-excel.js employees.xlsx \\');
    console.log('    --default-manager manager@example.com \\');
    console.log('    --default-admin admin@example.com \\');
    console.log('    --default-shift morning \\');
    console.log('    --default-address "Main Office"');
    console.log('\n📋 Expected Excel columns:');
    console.log('  Required: Name (or NAME)');
    console.log('  Optional: Email, Mobile, Address, Shift, Manager Email, Admin Email, Site');
    console.log('  Note: Address and Shift will use defaults if not provided');
    process.exit(1);
  }

  // Parse command line options
  const options = {
    defaultManagerEmail: null,
    defaultAdminEmail: null,
    defaultSiteName: null,
    defaultShift: 'morning',
    defaultAddress: 'Not Provided',
    isCreatedByAdmin: false,
    skipDuplicates: true
  };

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--default-manager' && process.argv[i + 1]) {
      options.defaultManagerEmail = process.argv[++i];
    } else if (arg === '--default-admin' && process.argv[i + 1]) {
      options.defaultAdminEmail = process.argv[++i];
    } else if (arg === '--default-site' && process.argv[i + 1]) {
      options.defaultSiteName = process.argv[++i];
    } else if (arg === '--default-shift' && process.argv[i + 1]) {
      options.defaultShift = process.argv[++i];
    } else if (arg === '--default-address' && process.argv[i + 1]) {
      options.defaultAddress = process.argv[++i];
    } else if (arg === '--created-by-admin') {
      options.isCreatedByAdmin = true;
    } else if (arg === '--allow-duplicates') {
      options.skipDuplicates = false;
    }
  }

  // Resolve file path (support relative and absolute paths)
  const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

  try {
    await importEmployees(resolvedPath, options);
  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the script
main().catch(console.error);

