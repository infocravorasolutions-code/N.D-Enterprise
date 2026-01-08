# Excel Import Guide for Employees

This guide explains how to import employee data from an Excel file into the database.

## Prerequisites

1. Make sure you have an Excel file (`.xlsx` or `.xls`) with employee data
2. Ensure MongoDB is running and connected
3. Make sure you have at least one Manager and one Admin in the database

## Excel File Format

Your Excel file should have the following columns:

### Required Columns:
- **Name** (or `name`, `NAME`, `Employee Name`, `Full Name`) - Employee's full name
  - This is the ONLY required column if you use command-line defaults!

### Optional Columns:
- **Address** (or `address`, `ADDRESS`, `Location`, `location`) - Employee's address
  - If not provided, will use `--default-address` value (default: "Not Provided")
- **Shift** (or `shift`, `SHIFT`, `Shift Type`, `shift_type`) - Must be one of: `morning`, `evening`, or `night`
  - Accepts variations: "Morning", "M", "Evening", "E", "Night", "N"
  - If not provided, will use `--default-shift` value (default: "morning")
- **Email** (or `email`, `EMAIL`, `Email Address`) - Employee's email address
- **Mobile** (or `mobile`, `MOBILE`, `Phone`, `phone`, `Contact`) - Employee's phone number
- **Manager Email** (or `manager_email`, `Manager`, `manager`, `ManagerEmail`) - Manager's email or name
- **Admin Email** (or `admin_email`, `Created By`, `created_by`, `Admin`, `admin`) - Admin's email or name for `createdBy`
- **Site** (or `site`, `SITE`, `Site Name`, `site_name`, `SiteName`) - Site name (optional, leave empty for global employees)

### Note:
- The script will ignore the "No." column if present
- You can import with just names if you provide defaults via command line

## Example Excel Files

### Minimal Format (Just Names):
| No. | NAME |
|-----|------|
| 1 | JOSHNABEN RAVAT |
| 2 | LALITABEN RAVAT |
| 3 | GAJRABEN RAVAT |

### Full Format:
| Name | Email | Mobile | Address | Shift | Manager Email | Admin Email | Site |
|------|-------|--------|---------|-------|---------------|-------------|------|
| John Doe | john@example.com | 1234567890 | 123 Main St | morning | manager@example.com | admin@example.com | Site A |
| Jane Smith | jane@example.com | 0987654321 | 456 Oak Ave | evening | manager@example.com | admin@example.com | |

## Usage

### Basic Usage

```bash
cd backend
node import-employees-from-excel.js path/to/your/file.xlsx
```

### With Default Manager

If all employees belong to the same manager, you can set a default:

```bash
node import-employees-from-excel.js employees.xlsx --default-manager manager@example.com
```

### With Default Admin

If all employees are created by the same admin:

```bash
node import-employees-from-excel.js employees.xlsx --default-admin admin@example.com
```

### With Default Site

If all employees belong to the same site:

```bash
node import-employees-from-excel.js employees.xlsx --default-site "Site Name"
```

### With Default Shift and Address

For files with only names, set defaults:

```bash
node import-employees-from-excel.js employees.xlsx \
  --default-manager manager@example.com \
  --default-shift morning \
  --default-address "Main Office Location"
```

### Complete Example (Minimal Data)

For Excel files with just names (like your list):

```bash
node import-employees-from-excel.js employees.xlsx \
  --default-manager manager@example.com \
  --default-admin admin@example.com \
  --default-shift morning \
  --default-address "Not Provided" \
  --created-by-admin
```

## Command Line Options

- `--default-manager <email/name>` - **REQUIRED** - Set default manager for all employees
- `--default-admin <email/name>` - Set default admin for `createdBy` field (if not specified, uses manager)
- `--default-site <name>` - Set default site for all employees (if not specified in Excel)
- `--default-shift <shift>` - Set default shift: `morning`, `evening`, or `night` (default: `morning`)
- `--default-address <address>` - Set default address if not in Excel (default: `"Not Provided"`)
- `--created-by-admin` - Set `isCreatedByAdmin` to `true` (default: `false`)
- `--allow-duplicates` - Allow duplicate emails/names (default: skips duplicates)

## How It Works

1. **Manager Lookup**: The script looks up managers by email first, then by name (case-insensitive)
2. **Admin Lookup**: The script looks up admins by email first, then by name (case-insensitive)
3. **Site Lookup**: The script looks up sites by name (case-insensitive, must be active)
4. **Duplicate Detection**: 
   - By default, employees with duplicate emails are skipped
   - If no email, checks for duplicate names (case-insensitive)
5. **Default Values**: 
   - Missing addresses use `--default-address` (default: "Not Provided")
   - Missing shifts use `--default-shift` (default: "morning")
   - Missing emails/mobiles are set to empty strings
6. **Validation**: Each row is validated before import. Invalid rows are reported in the summary

## Output

The script will show:
- ✅ Successfully imported employees
- ❌ Failed rows with reasons
- ⏭️ Skipped rows (duplicates)
- 📊 Summary statistics

## Troubleshooting

### "Manager not found"
- Make sure the manager exists in the database
- Check the email/name spelling in Excel
- Or use `--default-manager` option

### "Admin not found"
- Make sure the admin exists in the database
- Check the email/name spelling in Excel
- Or use `--default-admin` option
- Note: If admin not found, the script will use the manager as `createdBy`

### "Invalid shift value"
- Shift must be one of: `morning`, `evening`, or `night`
- Accepts variations: "Morning", "M", "Evening", "E", "Night", "N"

### "Duplicate email"
- By default, duplicate emails are skipped
- Use `--allow-duplicates` to import duplicates (not recommended)

## Notes

- The script automatically handles empty optional fields
- Manager and Admin can be identified by email or name
- Site is optional - leave empty for global employees
- If `createdBy` is not specified, it defaults to the manager
- All text matching is case-insensitive

