# Site/Event Management Feature

## Overview

This feature allows you to manage short-term sites/events separately from your main project. Each site can have its own employees, managers, and attendance records. Admins can view all sites and their reports in read-only mode.

## Architecture

### Backend Changes

1. **New Model: Site** (`backend/models/site.models.js`)
   - Fields: name, location, description, startDate, endDate, status, createdBy, isActive
   - Status options: 'active', 'completed', 'cancelled'

2. **Updated Models:**
   - **Employee**: Added optional `siteId` field (null = global employee)
   - **Manager**: Added optional `siteId` field (null = global manager)
   - **Attendance**: Added optional `siteId` field (null = global attendance)

3. **New Controller: Site Controller** (`backend/controller/site.controller.js`)
   - `createSite`: Create a new site
   - `getAllSites`: Get all sites (with optional status filter)
   - `getSiteById`: Get a single site
   - `updateSite`: Update site details
   - `deleteSite`: Soft delete a site (sets isActive to false)
   - `getSiteStats`: Get comprehensive statistics for a site
   - `getSiteEmployees`: Get employees assigned to a site
   - `getSiteManagers`: Get managers assigned to a site
   - `getSiteAttendance`: Get attendance records for a site

4. **Updated Controllers:**
   - **Employee Controller**: Now supports `siteId` when creating employees
   - **Manager Controller**: Now supports `siteId` when creating managers
   - **Attendance Controller**: Automatically assigns `siteId` from employee if not provided

5. **New Routes** (`backend/routes/site.routes.js`)
   - All routes require authentication
   - `/api/site/` - POST: Create site
   - `/api/site/all` - GET: Get all sites
   - `/api/site/:id` - GET, PUT, DELETE: Site operations
   - `/api/site/:id/stats` - GET: Get site statistics
   - `/api/site/:id/employees` - GET: Get site employees
   - `/api/site/:id/managers` - GET: Get site managers
   - `/api/site/:id/attendance` - GET: Get site attendance

### Frontend Changes

1. **New Pages:**
   - **Sites.jsx**: Lists all sites with filtering and search
   - **SiteDetails.jsx**: Shows detailed site information, statistics, and reports

2. **Updated Components:**
   - **Sidebar.jsx**: Added "Sites & Events" menu item for admins
   - **App.jsx**: Added routes for `/sites` and `/sites/:id`

3. **Updated Services:**
   - **api.js**: Added `siteAPI` with all site-related API methods

## How It Works

### For Admins

1. **Viewing Sites:**
   - Navigate to "Sites & Events" from the sidebar
   - See all sites in a card grid layout
   - Filter by status (active, completed, cancelled)
   - Search by name, location, or description

2. **Viewing Site Details:**
   - Click on any site card to view details
   - See comprehensive statistics:
     - Total employees and managers
     - Working employees count
     - Shift-wise distribution
     - Today's attendance
     - Last 7 days attendance trend

3. **Creating Sites:**
   - Currently, sites can be created via API (frontend UI for creation can be added later)
   - Use POST `/api/site/` with:
     ```json
     {
       "name": "Event Name",
       "location": "Event Location",
       "description": "Optional description",
       "startDate": "2024-01-01",
       "endDate": "2024-01-31",
       "status": "active"
     }
     ```

### For Managers

- Managers assigned to a site will automatically have their employees and attendance linked to that site
- When a manager creates an employee, if the manager has a `siteId`, the employee will automatically be assigned to that site

### Data Flow

1. **Creating a Site:**
   - Admin creates a site → Site is stored with `createdBy` = admin ID

2. **Assigning Managers to Site:**
   - When creating a manager, include `siteId` in the request
   - Manager is linked to the site

3. **Assigning Employees to Site:**
   - When creating an employee, include `siteId` in the request
   - OR if manager has a `siteId`, employee automatically gets that `siteId`

4. **Recording Attendance:**
   - When an employee clocks in, if the employee has a `siteId`, attendance is automatically linked to that site
   - OR you can explicitly pass `siteId` in the step-in request

## API Examples

### Create a Site
```javascript
POST /api/site/
Headers: { Authorization: "Bearer <token>" }
Body: {
  "name": "Summer Festival 2024",
  "location": "Central Park",
  "description": "Annual summer festival",
  "startDate": "2024-06-01",
  "endDate": "2024-06-30",
  "status": "active"
}
```

### Get Site Statistics
```javascript
GET /api/site/:siteId/stats
Headers: { Authorization: "Bearer <token>" }
```

### Get Site Employees
```javascript
GET /api/site/:siteId/employees?isWorking=true&shift=morning
Headers: { Authorization: "Bearer <token>" }
```

### Create Employee for Site
```javascript
POST /api/employee/
Headers: { Authorization: "Bearer <token>" }
Body (FormData): {
  "name": "John Doe",
  "address": "123 Main St",
  "managerId": "<manager-id>",
  "shift": "morning",
  "createdBy": "<admin-id>",
  "isCreatedByAdmin": true,
  "siteId": "<site-id>"  // Optional: assign to site
}
```

## Features

✅ **Site Management**: Create, view, update, and delete sites
✅ **Site-specific Employees**: Assign employees to sites
✅ **Site-specific Managers**: Assign managers to sites
✅ **Site-specific Attendance**: Track attendance per site
✅ **Comprehensive Statistics**: View detailed stats for each site
✅ **Read-only Admin Access**: Admins can view all sites and their data
✅ **Filtering & Search**: Filter sites by status and search by name/location
✅ **Attendance Trends**: View last 7 days attendance trends per site

## Future Enhancements

- [ ] Frontend UI for creating/editing sites
- [ ] Bulk assign employees/managers to sites
- [ ] Export site reports to PDF/Excel
- [ ] Site-specific dashboards
- [ ] Site comparison views
- [ ] Site templates for recurring events

## Notes

- Sites are soft-deleted (isActive = false) rather than hard-deleted to preserve data integrity
- Global employees/managers (without siteId) continue to work as before
- Attendance records automatically inherit siteId from the employee if not explicitly provided
- All site routes require authentication
- Read-only admins can view sites but cannot create/modify them (enforced by middleware)

