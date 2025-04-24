const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'teacher', 'admin'], default: 'student' },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
  year: { type: String, default: null }
});

module.exports = mongoose.model('User', userSchema);
