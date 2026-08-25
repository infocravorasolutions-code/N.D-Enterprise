import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { autoStepIn } from './controller/cron.controller.js';

dotenv.config();
const MONGO_URI = process.env.MONGODB_URI;

const runBackfill = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    console.log('--- Backfilling Morning Shift ---');
    await autoStepIn('morning', 7);
    
    console.log('--- Backfilling Evening Shift ---');
    await autoStepIn('evening', 15);

    console.log('Backfill complete!');
  } catch (error) {
    console.error('Error during backfill:', error);
  } finally {
    mongoose.disconnect();
  }
};

runBackfill();
