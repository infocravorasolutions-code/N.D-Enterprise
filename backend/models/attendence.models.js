import { model, Schema } from "mongoose";

const attendanceSchema = new Schema({
  employeeId: {
    type: Schema.Types.ObjectId,
    ref: "Employee",
    required: true
  },
  managerId: {
    type: Schema.Types.ObjectId,
    ref: "Manager",
    required: true
  },
  stepIn: {
    type: Date,
    required: true
  },
  stepOut: {
    type: Date,
    default: null
  },
  totalTime: {
    type: Number // in minutes or seconds, as you prefer
  },
  stepInImage: {
    type: String // URL or base64 string
  },
  stepOutImage: {
    type: String // URL or base64 string
  },
  stepInLongitude: {
    type: Number
  },
  stepInLatitude: {
    type: Number
  },
  stepInAddress: {
    type: String
  },
  stepOutLongitude: {
    type: Number
  },
  stepOutLatitude: {
    type: Number
  },
  stepOutAddress: {
    type: String
  },
  // Keep legacy fields for backward compatibility
  longitude: {
    type: Number
  },
  latitude: {
    type: Number
  },
  address: {
    type: String
  },
   shift : {
    type: String,
    enum: ['morning', 'evening', 'night'],
    required: true
  }, 
  note: {
    type: String // Optional: note for attendance
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
attendanceSchema.index({ employeeId: 1, stepIn: 1 });
attendanceSchema.index({ shift: 1, stepIn: 1 });
attendanceSchema.index({ managerId: 1 });
attendanceSchema.index({ stepIn: 1, shift: 1 }); // For summary queries
attendanceSchema.index({ stepIn: 1 }); // For date range queries

const Attendance = model("Attendance", attendanceSchema);
export default Attendance;