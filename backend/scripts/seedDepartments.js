// 📁 backend/scripts/seedDepartments.js

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load ENV config
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('../config/db');
const Department = require('../models/Department');

const departments = [
  'Computer',
  'Mechanical',
  'Electrical',
  'Civil',
  'IT',
  'Electronics',
  'AI & DS',
  'Chemical',
  'Production',
  'Instrumentation'
];

const seedDepartments = async () => {
  try {
    await connectDB();

    for (const name of departments) {
      const exists = await Department.findOne({ name });
      if (!exists) {
        await Department.create({ name });
        console.log(`✅ Created: ${name}`);
      } else {
        console.log(`⚠️ Already exists: ${name}`);
      }
    }

    console.log('\n🎉 Department seeding complete.');
    mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error seeding departments:', err.message);
    mongoose.disconnect();
  }
};

seedDepartments();
