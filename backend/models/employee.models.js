import { model,Schema } from "mongoose";


const employeeSchema = new Schema({
  email: {
    type: String,
default:""
  },
  name: {
    type: String,
    required: true,
  },
  mobile: {
    type: String,
   default:""
  },
  address: {
    type: String,
    required: true,
  },
  managerId: {
    type: Schema.Types.ObjectId,
    ref: 'Manager',
    required: true
  },
  shift : {
    type: String,
    enum: ['morning', 'evening', 'night'],
    required: true
  }, 
  isWorking: {
    type: Boolean,
    default: false
  },
  image: {
    type: String,
    default: null
  },
  isCreatedByAdmin: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin || Manager', // Assuming createdBy can be either Admin or Manager
    required: true
  }
}, {
  timestamps: true
});

const Employee = model('Employee', employeeSchema);
export default Employee;
