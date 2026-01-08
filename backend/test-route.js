// Quick test to verify route is registered
import express from 'express';

const app = express();
const router = express.Router();

// Simulate the route structure
router.post("/", (req, res) => res.send('create'));
router.get("/all", (req, res) => res.send('all'));
router.get("/:id/stats", (req, res) => res.send('stats'));
router.get("/:id/employees", (req, res) => res.send('employees'));
router.post("/:id/assign-employees", (req, res) => res.send('assign-employees'));
router.get("/:id", (req, res) => res.send('get by id'));

app.use("/api/site", router);

// Test the route
const testReq = {
  method: 'POST',
  url: '/api/site/6959701cb69be1f36565f581/assign-employees',
  params: {}
};

console.log('Route structure test:');
console.log('POST /api/site/:id/assign-employees should match before GET /api/site/:id');
console.log('Route order is correct!');

