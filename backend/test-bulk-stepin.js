import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

// Test script for bulk step-in functionality
const testBulkStepIn = async () => {
  const baseURL = 'http://localhost:5678/api/attendence';
  
  // Create FormData
  const formData = new FormData();
  
  // Add required fields
  formData.append('adminEmail', 'mohit123456rathod@gmail.com');
  formData.append('shift', 'morning'); // or 'evening' or 'night'
  formData.append('longitude', '72.8777');
  formData.append('latitude', '19.0760');
  formData.append('address', 'Office Location');
  formData.append('note', 'Bulk step-in for morning shift');
  
  // Add step-in image (optional - if you have an image file)
  // formData.append('stepInImage', fs.createReadStream('path/to/image.jpg'));
  
  try {
    const response = await fetch(`${baseURL}/bulk-step-in`, {
      method: 'POST',
      body: formData,
      headers: {
        ...formData.getHeaders()
      }
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Bulk step-in successful!');
      console.log('Summary:', result.summary);
      console.log('Results:', result.results);
    } else {
      console.log('❌ Bulk step-in failed:', result.message);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
};

// Example usage
console.log('Testing bulk step-in functionality...');
console.log('Make sure your server is running on localhost:5678');
console.log('And you have employees created by admin: mohit123456rathod@gmail.com');
console.log('\nTo test manually, use this curl command:');
console.log(`
curl -X POST http://localhost:5678/api/attendence/bulk-step-in \\
  -F "adminEmail=mohit123456rathod@gmail.com" \\
  -F "shift=morning" \\
  -F "longitude=72.8777" \\
  -F "latitude=19.0760" \\
  -F "address=Office Location" \\
  -F "note=Bulk step-in for morning shift" \\
  -F "stepInImage=@/path/to/image.jpg"
`);

// Uncomment to run the test
// testBulkStepIn();

