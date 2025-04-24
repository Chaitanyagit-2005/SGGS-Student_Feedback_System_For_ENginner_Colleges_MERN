const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true },       // e.g., Compiler Design
  year: { type: String, enum: ['FY', 'SY', 'TY', 'Final', 'MTech-FY', 'MTech-SY'], required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },  // only teacher role
  published: { type: Boolean, default: false }
});

module.exports = mongoose.model('Subject', subjectSchema);
