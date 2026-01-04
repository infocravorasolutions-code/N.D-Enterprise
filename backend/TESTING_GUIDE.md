# Auto Step-In Testing Guide

This guide will help you test the auto step-in cron job before deploying to production.

## ⚠️ CRITICAL: Database Safety Check

**ALWAYS check your database connection before testing!**

```bash
npm run check:db
```

### What This Does:
- ✅ Shows database type (Local vs Cloud/Production)
- ✅ Shows database name and connection details
- ✅ Warns if connected to production
- ✅ Tests the connection

### Safety Features:
- 🛑 Test scripts **automatically exit** if connected to production
- 🔒 Prevents accidental data modification in production
- 💡 Shows clear instructions to switch to local database

### If Connected to Production:
The test scripts will show:
```
⚠️  WARNING: You are connecting to a PRODUCTION/CLOUD database!
⚠️  This test will modify real data!
❌ Exiting for safety...
```

**To fix:** Set `MONGODB_URI=mongodb://localhost:27017/labor-management` in `.env`

## 📋 Prerequisites

1. Make sure you have:
   - Employees created in the database
   - Employees assigned to shifts (morning, evening, night)
   - At least one Manager in the database
   - MongoDB connection configured in `.env`

## 🧪 Testing Steps

### Step 1: Prepare Test Data

First, prepare your test data by stepping out all working employees and cleaning up today's auto step-in records:

```bash
node server/prepare-test-data-stepin.js
```

This script will:
- ✅ Step out all currently working employees
- ✅ Delete today's auto step-in records (to allow re-testing)
- ✅ Show you how many employees are ready for each shift

### Step 2: Test Auto Step-In

Test the auto step-in function for a specific shift:

```bash
# Test morning shift (7 AM)
node server/test-auto-stepin.js morning

# Test evening shift (3 PM)
node server/test-auto-stepin.js evening

# Test night shift (11 PM)
node server/test-auto-stepin.js night
```

**Or test with current time** (only works if current hour is 7, 15, or 23):
```bash
node server/test-auto-stepin.js
```

### Step 3: Verify Results

The test script will show you:
- ✅ Employees that were auto-stepped-in
- ✅ Location assigned to each employee
- ✅ Manager visibility (employees should be visible to their managers)
- ✅ Employee status updates (`isWorking: true`)
- ✅ Duplicate prevention (won't step in same employee twice)

## 🔍 What to Check

### ✅ Success Criteria

1. **Correct Shift Detection**
   - Morning shift employees step in at 7 AM
   - Evening shift employees step in at 3 PM
   - Night shift employees step in at 11 PM

2. **Employee Selection**
   - Only employees with `isWorking: false` are stepped in
   - Only employees assigned to the current shift are stepped in
   - Employees with open attendance are skipped

3. **Duplicate Prevention**
   - Employees already auto-stepped-in today are skipped
   - Employees with open attendance records are skipped

4. **Data Integrity**
   - Attendance records are created with correct shift
   - Random location is assigned from the 4 locations
   - Manager ID is set correctly (from employee's managerId)
   - Employee status is updated to `isWorking: true`

5. **Manager Visibility**
   - Managers can see their employees who were auto-stepped-in
   - Managers can step out these employees normally

## 🧪 Test Scenarios

### Scenario 1: Normal Flow
1. Prepare test data
2. Run test for morning shift
3. Verify employees are stepped in
4. Check manager dashboard - employees should be visible
5. Manager should be able to step out employees

### Scenario 2: Duplicate Prevention
1. Run test for morning shift
2. Run test again for morning shift (same day)
3. Verify no duplicate records are created
4. Verify employees are skipped with appropriate message

### Scenario 3: Multiple Shifts
1. Test morning shift
2. Test evening shift
3. Test night shift
4. Verify each shift only affects its assigned employees

### Scenario 4: Edge Cases
1. Test with employees who already have open attendance
2. Test with employees who are already working
3. Test with no employees for a shift
4. Test at non-shift-start hours (should skip)

## 🐛 Troubleshooting

### Issue: "No employees found for this shift"
**Solution:** Create employees and assign them to the shift you're testing.

### Issue: "No manager found"
**Solution:** Create at least one manager in the database.

### Issue: Employees not visible to managers
**Solution:** Check that employees have `managerId` set correctly.

### Issue: Duplicate records created
**Solution:** Check the duplicate prevention logic in the test output.

## 📊 Expected Output

When you run the test, you should see:

```
🧪 TESTING AUTO STEP-IN FUNCTION
============================================================

📅 Current Time (IST): 15/01/2024, 15:00:00
⏰ Current Hour (IST): 15

🎯 Testing for: EVENING shift

👥 Total employees assigned to evening shift: 5
   1. Employee 1 (ID: ...) - isWorking: false
   2. Employee 2 (ID: ...) - isWorking: false
   ...

🎯 Employees that will be auto-stepped-in: 5
   - Employee 1 (Manager: Manager Name)
   - Employee 2 (Manager: Manager Name)
   ...

🚀 RUNNING AUTO STEP-IN FUNCTION
============================================================
Auto-stepped in: Employee 1 (...) for evening shift at Gujari bajar
Auto-stepped in: Employee 2 (...) for evening shift at Dhobi Ghat
...

📊 RESULTS AFTER AUTO STEP-IN
============================================================

✅ Recently Auto-Stepped-In (Last 5 minutes): 5
   - Employee 1 (evening):
     Step In: 15/01/2024, 15:00:00
     Location: Gujari bajar
     Manager: Manager Name
     Note: Auto stepped in for evening shift

✅ TEST COMPLETED!
```

## 🚀 Production Deployment Checklist

Before deploying to production:

- [ ] All test scenarios pass
- [ ] No duplicate records created
- [ ] Manager visibility works correctly
- [ ] Employee status updates correctly
- [ ] Random locations are assigned
- [ ] Cron schedule is correct (every 1 hour)
- [ ] Timezone is set to "Asia/Kolkata"
- [ ] Error handling works (check logs)
- [ ] Database connection is stable

## 📝 Notes

- The cron job runs every hour at minute 0 (e.g., 7:00, 8:00, 9:00, etc.)
- Auto step-in only triggers at shift start times: 7 AM, 3 PM, 11 PM
- At other hours, the function will skip execution
- Test scripts use the same logic as production code
- You can run tests multiple times after preparing data

## 🔗 Related Files

- `server/controller/cron.controller.js` - Main auto step-in function
- `server/test-auto-stepin.js` - Test script
- `server/prepare-test-data-stepin.js` - Test data preparation
- `server/server.js` - Cron schedule configuration

