# 🚀 Quick Test Guide - Auto Step-In

## ⚠️ IMPORTANT: Check Your Database First!

**Before running any tests, verify you're using LOCAL database:**

```bash
npm run check:db
```

This will show you:
- ✅ Database type (Local vs Cloud/Production)
- ✅ Database name
- ✅ Connection status
- ⚠️ Warnings if connected to production

**If you see production/cloud database:**
- The test scripts will **automatically exit** for safety
- To use local: Set `MONGODB_URI=mongodb://localhost:27017/labor-management` in `.env`

## Quick Start (3 Steps)

### 1️⃣ Prepare Test Data
```bash
cd server
npm run prepare:test
```
This steps out all working employees and prepares them for testing.

### 2️⃣ Test a Specific Shift
```bash
# Test morning shift (7 AM)
npm run test:stepin:morning

# Test evening shift (3 PM)
npm run test:stepin:evening

# Test night shift (11 PM)
npm run test:stepin:night
```

### 3️⃣ Verify Results
Check the console output. You should see:
- ✅ Employees that were auto-stepped-in
- ✅ Random locations assigned
- ✅ Manager visibility confirmed

## What Gets Tested?

✅ **Shift Detection** - Only runs at 7 AM, 3 PM, 11 PM  
✅ **Employee Selection** - Only non-working employees for the shift  
✅ **Duplicate Prevention** - Won't step in same employee twice  
✅ **Manager Visibility** - Employees visible to their managers  
✅ **Random Locations** - One of 4 locations assigned randomly  
✅ **Status Updates** - Employee `isWorking` set to `true`

## Expected Output

```
🎯 Testing for: EVENING shift
👥 Total employees: 5
✅ Recently Auto-Stepped-In: 5
   - Employee 1: Step In: 15:00:00, Location: Gujari bajar
   - Employee 2: Step In: 15:00:00, Location: Dhobi Ghat
   ...
✅ TEST COMPLETED!
```

## Troubleshooting

**No employees found?**
→ Create employees and assign them to shifts

**Employees not visible to managers?**
→ Check employee's `managerId` is set

**Want to test again?**
→ Run `npm run prepare:test` first

## Full Documentation

See `TESTING_GUIDE.md` for detailed testing scenarios and edge cases.

