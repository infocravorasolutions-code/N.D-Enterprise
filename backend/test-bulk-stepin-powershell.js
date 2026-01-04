// Simple test script for bulk step-in using Node.js fetch
const testBulkStepIn = async () => {
  try {
    const formData = new FormData();
    
    // Add required fields
    formData.append('adminEmail', 'mohit123456rathod@gmail.com');
    formData.append('shift', 'morning');
    formData.append('longitude', '72.8777');
    formData.append('latitude', '19.0760');
    formData.append('address', 'Office Location');
    formData.append('note', 'Bulk step-in for morning shift');
    
    console.log('Testing bulk step-in...');
    console.log('URL: http://localhost:5678/api/attendence/bulk-step-in');
    console.log('Admin Email: mohit123456rathod@gmail.com');
    console.log('Shift: morning');
    
    const response = await fetch('http://localhost:5678/api/attendence/bulk-step-in', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    console.log('\n=== Response ===');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Bulk step-in successful!');
      if (result.summary) {
        console.log(`Total Employees: ${result.summary.totalEmployees}`);
        console.log(`Successful: ${result.summary.successful}`);
        console.log(`Failed: ${result.summary.failed}`);
        console.log(`Already Working: ${result.summary.alreadyWorking}`);
      }
    } else {
      console.log('\n❌ Bulk step-in failed:', result.message);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
};

// Run the test
testBulkStepIn();
