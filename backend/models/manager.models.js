import { model,Schema, Types } from "mongoose";


const managerSchema = new Schema({
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
  mobile: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  userType:{
type:String,
default:"manager"
  },
 createdBy:{
  type:Schema.Types.ObjectId,
  ref:"Admin"
 },
 isActive:{
type:Boolean,
default:false
 },
 otp: String,
otpExpires: Date,
 siteId: {
  type: Schema.Types.ObjectId,
  ref: 'Site',
  default: null // null means global manager, not assigned to any site
 },
}, {
  timestamps: true
});

const Manager = model('Manager', managerSchema);
export default Manager;
