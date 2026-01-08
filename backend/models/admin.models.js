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
  siteId: {
    type: Schema.Types.ObjectId,
    ref: 'Site',
    default: null // null means superadmin or readonly admin not assigned to any site
  },
  otp: String,
otpExpires: Date,

},{
    timestamps: true
});

const Admin = model('Admin', adminSchema);
export default Admin;
