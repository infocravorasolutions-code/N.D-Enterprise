import { model,Schema } from "mongoose";


const adminSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
    name: {
        type: String,
        required: true,
    },
    mobile : {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
      role: {
    type: String,
    enum: ["superadmin", "readonly"],
    default: "superadmin"
  },
  otp: String,
otpExpires: Date,

},{
    timestamps: true
});

const Admin = model('Admin', adminSchema);
export default Admin;
