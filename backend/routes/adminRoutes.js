// 📁 backend/routes/adminRoutes.js

const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const express = require('express');
const router = express.Router();
const upload = multer({ dest: 'uploads/' });

const Department = require('../models/Department');
const Subject = require('../models/Subject');
const User = require('../models/User');
const Feedback = require('../models/Feedback');
const { requireLogin } = require('../middleware/authMiddleware');

const yearOptions = ['FY', 'SY', 'TY', 'Final', 'MTech-FY', 'MTech-SY'];

// ================== ADMIN ROUTES =====================
// 📦 Add this function in the same file above all routes
function checkAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).send("⛔ Access denied. Only admins allowed.");
  }
  next();
}

// Dashboard
router.get('/dashboard', requireLogin, checkAdmin, (req, res) => {
  res.render('admin/dashboard', { user: req.user });
});

// Students
router.get('/students', requireLogin, checkAdmin, async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).populate('department');
    const departments = await Department.find({});
    
    res.render('admin/students', {
      students,
      departments,
      user: req.user,
      message: req.session.message
    });

    req.session.message = null; // clear message after render
  } catch (err) {
    console.error("❌ Error fetching students:", err.message); // 👈 Add this log
    res.status(500).send("Error fetching students");
  }
});



// Teachers
// Teachers Page
router.get('/teachers', requireLogin, async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher' });

    res.render('admin/teachers', {
      teachers,
      user: req.user,
      message: req.session.message || null
    });

    req.session.message = null; // clear message
  } catch (err) {
    res.status(500).send("Error fetching teachers");
  }
});


// Add Subject - GET
router.get('/add-subject', requireLogin, checkAdmin, async (req, res) => {
  const departments = await Department.find({});
  const teachers = await User.find({ role: 'teacher' });
  res.render('admin/addSubject', {
    departments,
    teachers,
    years: ['FY', 'SY', 'TY', 'Final', 'MTech-FY', 'MTech-SY'],
    user: req.user
  });
});


// Add Subject - POST
router.post('/add-subject', requireLogin, checkAdmin, async (req, res) => {
  const { name, year, department, teacher, published } = req.body;
  try {
    await new Subject({ name, year, department, teacher, published: published === 'on' }).save();
    res.redirect('/admin/add-subject');
  } catch (err) {
    res.status(500).send("Server error while adding subject.");
  }
});

// Upload Page
router.get('/upload', requireLogin, checkAdmin, (req, res) => {
  res.render('admin/upload', { user: req.user });
});

// Upload CSV
// CSV Upload Route
router.post('/upload', upload.single('file'), requireLogin, async (req, res) => {
  const { type } = req.body;
  const file = req.file;
  if (!file) return res.status(400).send("No file uploaded");

  try {
    const workbook = xlsx.readFile(file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    const inserted = [];

    if (type === 'student') {
      for (let entry of data) {
        const dept = await Department.findOne({ name: entry.department });
        if (!dept) continue;

        const exists = await User.findOne({ email: entry.email });
        if (exists) continue;

        const hashedPassword = await bcrypt.hash("12345678", 10);

        await User.create({
          name: entry.name,
          email: entry.email,
          role: 'student',
          department: dept._id,
          year: entry.year,
          password: hashedPassword
        });

        inserted.push(entry.email);
      }
    }

    else if (type === 'teacher') {
      for (let entry of data) {
        const exists = await User.findOne({ email: entry.email });
        if (exists) continue;

        const hashedPassword = await bcrypt.hash("12345678", 10);

        await User.create({
          name: entry.name,
          email: entry.email,
          role: 'teacher',
          password: hashedPassword
        });

        inserted.push(entry.email);
      }
    }

    fs.unlinkSync(file.path);
    req.session.message = `✅ Imported ${inserted.length} ${type}s successfully! Default password: 12345678`;
    res.redirect(`/admin/${type === 'student' ? 'students' : 'teachers'}`);
  } catch (err) {
    console.error("❌ Upload Error:", err.message);
    res.status(500).send("❌ Error processing file.");
  }
});


// Subject List + Toggle
router.get('/subjects', requireLogin, checkAdmin, async (req, res) => {
  try {
    const subjects = await Subject.find({}).populate('teacher', 'name email').populate('department', 'name');
    res.render('admin/subjects', { subjects, user: req.user });
  } catch (err) {
    res.status(500).send("Error loading subjects.");
  }
});

router.post('/toggle-subject/:id', requireLogin, checkAdmin, async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    subject.published = !subject.published;
    await subject.save();
    res.redirect('/admin/subjects');
  } catch (err) {
    res.status(500).send("Failed to toggle.");
  }
});

const bcrypt = require('bcryptjs');

router.post('/add-student', requireLogin, checkAdmin, async (req, res) => {
  const { name, email, department, year } = req.body;

  try {
    const exists = await User.findOne({ email });
    if (exists) {
      req.session.message = "⚠️ Student already exists";
      return res.redirect('/admin/students');
    }

    const dept = await Department.findById(department);
    if (!dept) {
      req.session.message = "❌ Invalid department selected";
      return res.redirect('/admin/students');
    }

    const hashedPassword = await bcrypt.hash("12345678", 10);

    await User.create({
      name,
      email,
      role: 'student',
      department: dept._id,
      year,
      password: hashedPassword
    });

    req.session.message = "✅ Student added successfully with default password: 12345678";
    res.redirect('/admin/students');
  } catch (err) {
    console.error("Add student error:", err.message);
    req.session.message = "❌ Failed to add student";
    res.redirect('/admin/students');
  }
});


// Manual Add Teacher
router.post('/add-teacher', requireLogin, async (req, res) => {
  const { name, email } = req.body;
  try {
    const exists = await User.findOne({ email });
    if (exists) {
      req.session.message = "⚠️ Teacher already exists.";
      return res.redirect('/admin/teachers');
    }

    await new User({ name, email, role: 'teacher', password: null }).save();
    req.session.message = "✅ Teacher added successfully.";
    res.redirect('/admin/teachers');
  } catch (err) {
    req.session.message = "❌ Failed to add teacher.";
    res.redirect('/admin/teachers');
  }
});


// Feedback Report
router.get('/feedback-report', requireLogin, async (req, res) => {
  try {
    const subjects = await Subject.find({})
      .populate('teacher', 'name email')
      .populate('department', 'name');

    const report = [];

    for (const subject of subjects) {
      const feedbacks = await Feedback.find({ subject: subject._id });
      let total = feedbacks.length;
      let avg = 0;

      if (total > 0) {
        let score = 0;
        let count = 0;
        feedbacks.forEach(f =>
          f.responses.forEach(r => {
            score += r.rating;
            count++;
          })
        );
        avg = (score / count).toFixed(2);
      }

      report.push({
        subject: subject.name,
        teacher: subject.teacher?.name || '-',
        department: subject.department?.name || '-',
        year: subject.year,
        total,
        avg
      });
    }

    res.render('admin/feedbackReport', { report, user: req.user });
  } catch (err) {
    console.error("❌ Error generating report:", err.message);
    res.status(500).send("Error generating report.");
  }
});


// Edit Subject
// 📥 Edit Subject
router.post('/edit-subject/:id', requireLogin, async (req, res) => {
  const { name, year } = req.body;

  try {
    await Subject.findByIdAndUpdate(req.params.id, { name, year });
    res.redirect('/admin/subjects');
  } catch (err) {
    console.error("❌ Edit Subject Error:", err.message);
    res.status(500).send("Failed to update subject.");
  }
});


router.post('/update-student/:id', requireLogin, async (req, res) => {
  const { department, year } = req.body;
  try {
    await User.findByIdAndUpdate(req.params.id, {
      department,
      year
    });
    req.session.message = "✅ Student updated.";
    res.redirect('/admin/students');
  } catch (err) {
    console.error("❌ Update error:", err.message);
    req.session.message = "❌ Failed to update student.";
    res.redirect('/admin/students');
  }
});

module.exports = router;
