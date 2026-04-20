import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from "node-cron";
import managerRoutes from './routes/manager.routes.js';
import authRouter from "./routes/auth.routes.js";
// Import routes
import adminRoutes from './routes/admin.routes.js';

import employeeRoutes from './routes/employee.routes.js';
import dashboardRoutes from "./routes/dashboard.routes.js";
import attendenceRoutes from "./routes/attendence.routes.js"
import siteRoutes from "./routes/site.routes.js"
import { autoStepOut, autoStepIn } from './controller/cron.controller.js';
import { forgotPassword } from './controller/auth.controller.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5678;
const MONGO_URI = process.env.MONGODB_URI;

// CORS: Allow frontend origins (where the browser loads the app), NOT the API domain.
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'https://ndenterpries.com',
  'https://www.ndenterpries.com',
  ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(s => s.trim()) : []),
];

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  try {
    if (/\.vercel\.app$/.test(new URL(origin).hostname)) return true;
  } catch (_) {}
  return false;
};

// Explicit OPTIONS handler - some proxies return 502 if OPTIONS isn't handled early.
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.sendStatus(204);
});

app.use(cors({
  origin: (origin, cb) => {
    // Reflect request origin (allows any); use isOriginAllowed(origin) to restrict
    cb(null, origin || true);
  },
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204,
  preflightContinue: false,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/static", express.static("upload"));

// Connect to MongoDB
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});

app.use("/api/admin", adminRoutes);
// Import other routes as needed
app.use("/api/manager", managerRoutes); // Uncomment when manager routes are implemented

app.use("/api/employee",employeeRoutes);

app.use("/api/dashboard",dashboardRoutes)

app.use("/api/attendence",attendenceRoutes)

app.use("/api/site",siteRoutes)

app.use("/api/auth",authRouter)

// Auto step-out: Run every 30 minutes - checks if employees should be auto-stepped-out based on shift end times
cron.schedule("*/30 * * * *", autoStepOut, {
  timezone: "Asia/Kolkata"
});

// Auto step-in: Run every 1 hour at minute 0 - Auto step-in at shift start times (7 AM, 3 PM, 11 PM)
cron.schedule("0 * * * *", autoStepIn, {
  timezone: "Asia/Kolkata"
});




// Define a simple route
app.get('/', (req, res) => {
  res.send('Welcome to the Labor Management API');
});



// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
}); 
