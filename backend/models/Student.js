const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  year: { type: String, enum: ['FY', 'SY', 'TY', 'Final', 'MTech-FY', 'MTech-SY'], required: true },
  role: { type: String, default: 'student' }
});

module.exports = mongoose.model('Student', studentSchema);
