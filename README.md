# ND Enterprise Management System

A full-stack application for managing employees, supervisors, attendance, and reports.

## Project Structure

```
nd-enterprise-app/
├── frontend/          # React frontend application
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── backend/           # Node.js/Express backend server
│   ├── controller/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── server.js
│   └── package.json
└── README.md
```

## Features

- **Dashboard** - Overview of key metrics and recent activity
- **Employees** - Employee management and database
- **Supervisor** - Supervisor and team management
- **MasterRoll Report** - Master roll reporting system
- **Attendance Reports** - Detailed attendance tracking
- **Summary Report** - Analytics and summary overview

## Tech Stack

### Frontend
- React 18.3.1
- React Router DOM 6.26.0
- Vite 5.4.2

### Backend
- Node.js
- Express.js
- MongoDB (Mongoose)
- JWT Authentication
- Node Cron for scheduled tasks

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB database
- npm or yarn

### Installation

1. **Install Frontend Dependencies**
```bash
cd frontend
npm install
```

2. **Install Backend Dependencies**
```bash
cd backend
npm install
```

### Environment Setup

1. **Backend Environment Variables**
   - Create a `.env` file in the `backend/` directory
   - Add your MongoDB connection string and other configuration:
   ```
   MONGODB_URI=your_mongodb_connection_string
   PORT=5678
   JWT_SECRET=your_jwt_secret
   ```

2. **Frontend Environment Variables**
   - Create a `.env` file in the `frontend/` directory (optional)
   - Set API URL if different from default:
   ```
   VITE_API_URL=http://localhost:5678/api
   ```

### Running the Application

1. **Start the Backend Server**
```bash
cd backend
npm run dev
```
The backend server will run on `http://localhost:5678`

2. **Start the Frontend Development Server**
```bash
cd frontend
npm run dev
```
The frontend application will start on `http://localhost:3000`

### Build for Production

**Frontend:**
```bash
cd frontend
npm run build
```

**Backend:**
```bash
cd backend
npm start
```

## Development

- Frontend development server runs on port 3000
- Backend API server runs on port 5678
- API endpoints are prefixed with `/api`

## Documentation

- See `BACKEND_INTEGRATION.md` for backend integration details
- See `GITHUB_SETUP.md` for GitHub setup instructions
- Backend-specific documentation is in the `backend/` directory
