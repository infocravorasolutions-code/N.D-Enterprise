# Deployment Checklist for Assign Employees Route

## Issue
The route `POST /api/site/:id/assign-employees` is returning 404.

## Solution Steps

### 1. Verify Local Changes
The route has been fixed in:
- `backend/routes/site.routes.js` - Route is now defined before generic `/:id` route
- `backend/controller/site.controller.js` - Controller function exists

### 2. Deploy to Production

**If using Git + Auto-deploy (Vercel/Netlify):**
```bash
git add .
git commit -m "Fix: Add assign-employees route for sites"
git push origin main
# Wait for auto-deployment
```

**If using manual server:**
```bash
# SSH into your server
cd /path/to/backend
git pull origin main
npm install  # if new dependencies
pm2 restart all  # or your process manager
# OR
systemctl restart your-service
```

### 3. Verify Route is Registered

After deployment, check server logs for:
```
[SITE ROUTES] Registering site routes...
```

### 4. Test the Route

Test with curl or Postman:
```bash
curl -X POST https://api.ndenterpries.com/api/site/6959701cb69be1f36565f581/assign-employees \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"employeeIds": ["employee_id_1", "employee_id_2"]}'
```

### 5. Check Server Logs

If still failing, check production server logs for:
- Route registration messages
- Any errors during startup
- Authentication issues

## Route Order (Important!)

The route MUST be defined in this order:
1. `POST /` - Create site
2. `GET /all` - Get all sites
3. `GET /:id/stats` - Site stats
4. `GET /:id/employees` - Site employees
5. `GET /:id/managers` - Site managers
6. `GET /:id/attendance` - Site attendance
7. `POST /:id/assign-employees` - **Assign employees (BEFORE /:id)**
8. `GET /:id` - Get site by ID (generic route - must be last)
9. `PUT /:id` - Update site
10. `DELETE /:id` - Delete site

## Current Route File Location
`backend/routes/site.routes.js`

