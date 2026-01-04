# Backend Integration Guide

This document explains how the frontend is integrated with the backend API.

## Backend Setup

1. Navigate to the backend directory:
```bash
cd /Users/darshanpatel/Desktop/drenterprisefrontend/server
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the server directory with:
```
MONGODB_URI=your_mongodb_connection_string
PORT=5678
JWT_SECRET=your_jwt_secret_key
```

4. Start the backend server:
```bash
npm run dev
```

The backend will run on `http://localhost:5678`

## Frontend Configuration

1. Create a `.env` file in the frontend root directory:
```
VITE_API_URL=http://localhost:5678/api
```

2. If you need to change the API URL, update the `.env` file and restart the dev server.

## API Endpoints Used

### Employees
- `GET /api/employee/all` - Get all employees
- `POST /api/employee/` - Create employee (with image upload)
- `PUT /api/employee/:id` - Update employee
- `DELETE /api/employee/:id` - Delete employee

### Managers/Supervisors
- `GET /api/manager/all` - Get all managers
- `POST /api/manager/` - Create manager
- `PUT /api/manager/:id` - Update manager
- `DELETE /api/manager/:id` - Delete manager
- `POST /api/manager/login` - Manager login

### Dashboard
- `GET /api/dashboard/` - Get dashboard statistics

### Attendance
- `GET /api/attendence/` - Get all attendance records
- `GET /api/attendence/summary?date=YYYY-MM-DD&shift=morning|evening|night` - Get attendance summary
- `POST /api/attendence/step-in` - Mark step in
- `POST /api/attendence/step-out` - Mark step out

## Authentication

The frontend uses JWT tokens stored in localStorage. To authenticate:

1. Use the login function from `src/services/auth.js`
2. The token will be automatically included in API requests
3. Store admin ID in localStorage if needed: `localStorage.setItem('adminId', adminId)`

## File Uploads

Employee photos are uploaded using FormData:
- The image file is sent as `image` field
- Backend saves files to `/upload` directory
- Images are served from `/static/` endpoint

## Usage Example

```javascript
import { employeeAPI } from '../services/api'

// Fetch employees
const response = await employeeAPI.getAll()
const employees = response.data

// Create employee
const formData = {
  name: 'John Doe',
  email: 'john@example.com',
  mobile: '1234567890',
  address: '123 Main St',
  managerId: 'manager-id',
  shift: 'morning',
  createdBy: 'admin-id',
  isCreatedByAdmin: true
}
const imageFile = // File object from input
await employeeAPI.create(formData, imageFile)
```

## Notes

- All API calls require authentication (JWT token)
- The token is automatically added to request headers
- Image URLs are constructed as: `http://localhost:5678/static/{filename}`
- Error handling is done in the API service layer

