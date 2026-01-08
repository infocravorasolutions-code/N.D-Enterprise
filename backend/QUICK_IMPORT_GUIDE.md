# Quick Import Guide - Employees from Excel

## Step 1: Prepare Your Excel File

Your Excel file should have at least a `NAME` column (and optionally a `No.` column):

```
No. | NAME
----|------------------
1   | JOSHNABEN RAVAT
2   | LALITABEN RAVAT
3   | GAJRABEN RAVAT
```

Save it as `.xlsx` or `.xls` format.

## Step 2: Find a Manager Email

You need to use one of the existing managers. From the database, available managers are:

- `jitandrasolanki10@gmail.com` (Jitendra Ramanbhai solanki)
- `jimakvana1@gmail.com` (Jitendra Ambalalbhai Makwana)
- `dhruvdave474@gmail.com` (Dhruv Bharatbhai Dave)
- `ts3540424@gmail.com` (Tofik Gulamhusainbhai sheikh)
- `Ronn74824@gmail.com` (Ronak Nareshbhai Chouhan)
- `vagharis245@gmail.com` (Sunil Sampatbhai vagari)
- `manish@drenterprise.in` (Manish Jadhav)
- `mohitrathod0340@gmail.com` (Mohit Rathod)

## Step 3: Run the Import

```bash
cd backend

# Basic import (replace with your file path and manager email)
node import-employees-from-excel.js /path/to/your/employees.xlsx \
  --default-manager jitandrasolanki10@gmail.com \
  --default-admin jitandrasolanki10@gmail.com \
  --default-shift morning \
  --default-address "Not Provided"
```

## Step 4: Verify the Import

After importing, check if employees were added:

```bash
node check-imported-employees.js
```

## Common Issues

### Issue: "Manager not found"
- Make sure you're using the exact email from the list above
- Or use the manager's name instead of email

### Issue: "No employees showing in frontend"
- **For Admin users**: Only see employees with `siteId: null` (global employees)
- **For Manager users**: Only see employees assigned to them with `siteId: null`
- Make sure you didn't set `--default-site` during import if you want them visible to admins

### Issue: "Employees imported but not visible"
Run the diagnostic:
```bash
node check-imported-employees.js
```

This will show:
- How many employees are in the database
- Which manager they're assigned to
- Whether they have a siteId (which affects visibility)

## Example Full Command

```bash
node import-employees-from-excel.js ~/Downloads/employees.xlsx \
  --default-manager manish@drenterprise.in \
  --default-admin manish@drenterprise.in \
  --default-shift morning \
  --default-address "Main Office"
```

## After Import

1. Check the import summary - it will show how many were imported
2. Run `node check-imported-employees.js` to verify
3. Log in to the frontend and check if employees appear
4. If not visible, check:
   - Are you logged in as Admin? (only sees `siteId: null` employees)
   - Are you logged in as Manager? (only sees employees assigned to you with `siteId: null`)

