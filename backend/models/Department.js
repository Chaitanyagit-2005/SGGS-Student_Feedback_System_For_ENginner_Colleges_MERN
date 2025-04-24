const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true } // e.g., CSE, ECE, MECH
});

module.exports = mongoose.model('Department', departmentSchema);
