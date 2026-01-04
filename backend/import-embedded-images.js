import ExcelJS from 'exceljs';
import mongoose from 'mongoose';
import Employee from './models/employee.models.js';
import Manager from './models/manager.models.js';
import Admin from './models/admin.models.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import sharp from 'sharp';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Function to process and save image
const processImage = async (imageBuffer, employeeName, index) => {
  try {
    if (!imageBuffer) {
      return null;
    }

    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(__dirname, 'upload');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Clean employee name for filename
    const cleanName = employeeName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const timestamp = Date.now();
    const filename = `${timestamp}-${cleanName}-${index}.jpg`;
    const filepath = path.join(uploadDir, filename);

    // Ensure imageBuffer is a Buffer
    let buffer;
    if (Buffer.isBuffer(imageBuffer)) {
      buffer = imageBuffer;
    } else if (imageBuffer.buffer) {
      buffer = Buffer.from(imageBuffer.buffer);
    } else {
      buffer = Buffer.from(imageBuffer);
    }

    // Process image with sharp (resize, optimize)
    await sharp(buffer)
      .resize(300, 300, { 
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toFile(filepath);

    console.log(`Image saved for ${employeeName}: ${filename}`);
    return filename;

  } catch (error) {
    console.error(`Error processing image for ${employeeName}:`, error.message);
    return null;
  }
};

// Function to extract images from Excel workbook with proper row mapping
const extractImagesFromWorkbook = async (workbook) => {
  const images = {};
  
  try {
    // Get the first worksheet
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      console.log('No worksheet found');
      return images;
    }

    // Get all images from the worksheet
    const imageList = worksheet.getImages();
    console.log(`Found ${imageList.length} images in the worksheet`);

    // Create a mapping of Excel row positions to actual data rows
    // We'll sort images by their Excel row position and map them sequentially to data rows
    const sortedImages = imageList.map((image, index) => {
      const cellAddress = image.range.tl;
      return {
        index: index,
        excelRow: cellAddress.row,
        col: cellAddress.col,
        image: image
      };
    }).sort((a, b) => a.excelRow - b.excelRow); // Sort by Excel row position

    console.log('Image mapping:');
    // Process each image in order
    for (let i = 0; i < sortedImages.length; i++) {
      const imageData = sortedImages[i];
      const image = imageData.image;
      const imageId = image.imageId;
      
      try {
        // Get image buffer from workbook
        const imageBuffer = workbook.model.media[imageId];
        if (imageBuffer) {
          // Map to data row: first image goes to row 2, second to row 3, etc.
          const dataRow = i + 2;
          
          // Store image with data row number as key
          images[dataRow] = imageBuffer;
          console.log(`Image ${i + 1}: Excel row ${imageData.excelRow.toFixed(2)} -> Data row ${dataRow} (${imageData.col.toFixed(2)})`);
        }
      } catch (error) {
        console.error(`Error extracting image ${i}:`, error.message);
      }
    }
  } catch (error) {
    console.error('Error extracting images:', error.message);
  }
  
  return images;
};

// Function to check for duplicate names before import
const checkForDuplicates = async (worksheet) => {
  console.log('\n=== Checking for Duplicate Names ===');
  const duplicates = [];
  const existingEmployees = await Employee.find({}, 'name');
  const existingNames = existingEmployees.map(emp => emp.name.toLowerCase());
  
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    const name = row.getCell(2).value;
    
    if (name) {
      const nameStr = name.toString();
      const existingMatch = existingNames.find(existing => 
        existing.toLowerCase() === nameStr.toLowerCase()
      );
      
      if (existingMatch) {
        const existingEmployee = existingEmployees.find(emp => 
          emp.name.toLowerCase() === existingMatch.toLowerCase()
        );
        duplicates.push({
          row: rowNumber,
          excelName: nameStr,
          existingName: existingEmployee.name
        });
      }
    }
  }
  
  if (duplicates.length > 0) {
    console.log(`Found ${duplicates.length} duplicate names that will be skipped:`);
    duplicates.forEach(dup => {
      console.log(`  Row ${dup.row}: "${dup.excelName}" (matches existing: "${dup.existingName}")`);
    });
  } else {
    console.log('No duplicate names found. All employees will be imported.');
  }
  
  return duplicates;
};

// Function to import employees with embedded images
const importEmployeesWithEmbeddedImages = async () => {
  try {
    // Read the Excel file
    const filePath = path.join(__dirname, 'RIVERFRONT PHOTOS WITH NAME FINAL.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    // Get the first worksheet
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      console.log('No worksheet found');
      return;
    }

    // Check for duplicates first
    const duplicatePreview = await checkForDuplicates(worksheet);
    
    // Extract images first
    console.log('\nExtracting images from Excel...');
    const images = await extractImagesFromWorkbook(workbook);
    
    // Get a default manager and admin
    let defaultManager = await Manager.findOne();
    if (!defaultManager) {
      console.log('No manager found. Please create a manager first.');
      return;
    }
    
    let defaultAdmin = await Admin.findOne();
    if (!defaultAdmin) {
      console.log('No admin found. Please create an admin first.');
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    let imageCount = 0;
    let duplicateCount = 0;
    const duplicateNames = [];
    
    // Process each row synchronously to avoid connection issues
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      try {
        const row = worksheet.getRow(rowNumber);
        
        // Extract data from Excel row based on your structure
        const srNo = row.getCell(1).value; // SR NO column
        const name = row.getCell(2).value; // NAME column
        // Column 3 is PHOTOS (images are handled separately)
        
        if (!name) {
          console.log(`Row ${rowNumber}: Missing name, skipping...`);
          errorCount++;
          continue;
        }

        // Process image if available for this row
        let imageFilename = null;
        if (images[rowNumber]) {
          try {
            console.log(`Processing image for row ${rowNumber}: ${name}`);
            imageFilename = await processImage(images[rowNumber], name, rowNumber);
            if (imageFilename) {
              imageCount++;
            }
          } catch (imageError) {
            console.error(`Row ${rowNumber}: Error processing image for ${name}:`, imageError.message);
            // Continue without image
          }
        } else {
          console.log(`No image found for row ${rowNumber}: ${name}`);
        }

        const employeeData = {
          name: name.toString(),
          email: '', // Not in your Excel structure
          mobile: '', // Not in your Excel structure
          address: 'Not specified', // Not in your Excel structure
          managerId: defaultManager._id,
          shift: 'morning', // Default shift
          isWorking: false,
          image: imageFilename,
          isCreatedByAdmin: true,
          createdBy: defaultAdmin._id
        };
        
        // Check if employee already exists (case-insensitive)
        const existingEmployee = await Employee.findOne({ 
          name: { $regex: new RegExp(`^${employeeData.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        });
        if (existingEmployee) {
          console.log(`Row ${rowNumber}: Employee "${employeeData.name}" already exists (found: "${existingEmployee.name}"), skipping...`);
          duplicateCount++;
          duplicateNames.push({
            excelName: employeeData.name,
            existingName: existingEmployee.name,
            row: rowNumber
          });
          continue;
        }
        
        // Create new employee
        const newEmployee = new Employee(employeeData);
        await newEmployee.save();
        
        console.log(`Row ${rowNumber}: Successfully imported "${employeeData.name}"${imageFilename ? ' with image' : ''}`);
        successCount++;
        
      } catch (error) {
        console.error(`Row ${rowNumber}: Error importing employee:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n=== Import Summary ===');
    console.log(`Total rows processed: ${worksheet.rowCount - 1}`); // -1 for header
    console.log(`Successfully imported: ${successCount}`);
    console.log(`Images processed: ${imageCount}`);
    console.log(`Duplicates skipped: ${duplicateCount}`);
    console.log(`Other errors: ${errorCount}`);
    
    if (duplicateCount > 0) {
      console.log('\n=== Duplicate Names Found ===');
      duplicateNames.forEach(dup => {
        console.log(`Row ${dup.row}: "${dup.excelName}" (matches existing: "${dup.existingName}")`);
      });
    }
    
  } catch (error) {
    console.error('Error reading Excel file:', error);
  }
};

// Function to check duplicates only
const checkDuplicatesOnly = async () => {
  try {
    const filePath = path.join(__dirname, 'RIVERFRONT PHOTOS WITH NAME FINAL.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      console.log('No worksheet found');
      return;
    }

    await checkForDuplicates(worksheet);
    
  } catch (error) {
    console.error('Error checking duplicates:', error);
  }
};

// Function to preview Excel data and images
const previewExcelWithImages = async () => {
  try {
    const filePath = path.join(__dirname, 'RIVERFRONT PHOTOS WITH NAME FINAL.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      console.log('No worksheet found');
      return;
    }

    console.log('=== Excel File Preview ===');
    console.log(`Worksheet name: ${worksheet.name}`);
    console.log(`Total rows: ${worksheet.rowCount}`);
    console.log(`Total columns: ${worksheet.columnCount}`);
    
    // Show column headers
    const headerRow = worksheet.getRow(1);
    const headers = [];
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber] = cell.value;
    });
    console.log('Column headers:', headers.filter(h => h !== undefined));
    
    // Show first few rows of data
    console.log('\nFirst 3 data rows:');
    for (let rowNum = 2; rowNum <= Math.min(4, worksheet.rowCount); rowNum++) {
      const row = worksheet.getRow(rowNum);
      const rowData = [];
      row.eachCell((cell, colNumber) => {
        rowData[colNumber] = cell.value;
      });
      console.log(`Row ${rowNum}:`, rowData.filter(d => d !== undefined));
    }
    
    // Check for images
    const imageList = worksheet.getImages();
    console.log(`\nFound ${imageList.length} embedded images`);
    
    if (imageList.length > 0) {
      console.log('Image locations:');
      imageList.forEach((image, index) => {
        const cellAddress = image.range.tl;
        console.log(`  Image ${index + 1}: Row ${cellAddress.row}, Column ${cellAddress.col}`);
      });
    }
    
  } catch (error) {
    console.error('Error previewing Excel file:', error);
  }
};

// Function to extract only images (for testing)
const extractImagesOnly = async () => {
  try {
    const filePath = path.join(__dirname, 'RIVERFRONT PHOTOS WITH NAME FINAL.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      console.log('No worksheet found');
      return;
    }

    const imageList = worksheet.getImages();
    console.log(`Found ${imageList.length} images`);
    
    // Create images directory
    const imagesDir = path.join(__dirname, 'extracted-images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    
    // Extract each image
    for (let i = 0; i < imageList.length; i++) {
      const image = imageList[i];
      const imageId = image.imageId;
      const cellAddress = image.range.tl;
      
      try {
        const imageBuffer = workbook.model.media[imageId];
        if (imageBuffer) {
          const filename = `image_row_${cellAddress.row}_col_${cellAddress.col}.jpg`;
          const filepath = path.join(imagesDir, filename);
          
          // Save raw image
          fs.writeFileSync(filepath, imageBuffer);
          console.log(`Saved image: ${filename}`);
        }
      } catch (error) {
        console.error(`Error saving image ${i}:`, error.message);
      }
    }
    
    console.log(`Images extracted to: ${imagesDir}`);
    
  } catch (error) {
    console.error('Error extracting images:', error);
  }
};

// Main function
const main = async () => {
  const args = process.argv.slice(2);
  const command = args[0];
  
  await connectDB();
  
  switch (command) {
    case 'preview':
      await previewExcelWithImages();
      break;
    case 'import':
      await importEmployeesWithEmbeddedImages();
      break;
    case 'extract-images':
      await extractImagesOnly();
      break;
    case 'check-duplicates':
      await checkDuplicatesOnly();
      break;
    default:
      console.log('Usage:');
      console.log('  node import-embedded-images.js preview          - Preview Excel data and images');
      console.log('  node import-embedded-images.js import           - Import employees with embedded images');
      console.log('  node import-embedded-images.js extract-images   - Extract images only (for testing)');
      console.log('  node import-embedded-images.js check-duplicates - Check for duplicate names only');
      break;
  }
  
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
};

// Run the script
main().catch(console.error);
