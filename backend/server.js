// 📦 Core Dependencies
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 📦 Custom Modules
const connectDB = require('./config/db');
const User = require('./models/User');
const Feedback = require('./models/Feedback');
const authRoutes = require('./routes/authRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const { requireLogin } = require('./middleware/authMiddleware');


// 📌 Config
dotenv.config();
const app = express();
const session = require('express-session');

// After cookieParser
app.use(session({
  secret: 'supersecretkey', // change this in production
  resave: false,
  saveUninitialized: true
}));

const Department = require('./models/Department');

const defaultDepartments = [
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
  for (const name of defaultDepartments) {
    const exists = await Department.findOne({ name });
    if (!exists) {
      await Department.create({ name });
      console.log(`✅ Department added: ${name}`);
    } else {
      console.log(`ℹ️ Department already exists: ${name}`);
    }
  }
};

// Auto-run seeding after DB connection
connectDB().then(seedDepartments);

// 🧠 Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 🎨 View Engine
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

// 🔌 Database Connection
connectDB();

const adminRoutes = require('./routes/adminRoutes');
app.use('/admin', adminRoutes);

const studentRoutes = require('./routes/studentRoutes');
app.use('/student', studentRoutes);

const teacherRoutes = require('./routes/teacherRoutes');
app.use('/teacher', teacherRoutes);

// 🔐 Auth Pages (Register & Login)
// 🔐 Auth Pages (Register & Login)
app.get('/register', (req, res) => res.render('auth/register', { user: null }));
app.get('/login', (req, res) => res.render('auth/login', { user: null }));

// ✅ Open Registration
app.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;
  
    try {
      const existing = await User.findOne({ email });
      if (existing) return res.status(400).send("⚠️ Email already registered. Please login.");
  
      const hashed = await bcrypt.hash(password, 10);
      const newUser = new User({ name, email, password: hashed, role });
      await newUser.save();
  
      res.redirect('/login');
    } catch (err) {
      console.error("❌ Registration Error:", err.message);
      res.status(500).send("Error during registration.");
    }
  });
  
  // ✅ Open Login
  app.post('/login', async (req, res) => {
    const { email, password } = req.body;
  
    try {
      const user = await User.findOne({ email });
      if (!user) return res.status(400).send("❌ Email not registered. Please register.");
  
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).send("❌ Incorrect password.");
  
      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );
  
      res.cookie('token', token, { httpOnly: true });
      res.redirect(`/${user.role}/dashboard`);
    } catch (err) {
      console.error("❌ Login Error:", err.message);
      res.status(500).send("Login failed.");
    }
  });
  

// 🧑‍🎓 Student/Teacher/Admin Dashboard
app.get('/dashboard', requireLogin, async (req, res) => {
    if (req.user.role === 'student') {
      const feedbacks = await Feedback.find({ submittedBy: req.user._id });
      res.render('studentDashboard', { user: req.user, feedbacks });
    } else {
      res.send(`👋 Welcome ${req.user.name}! You are logged in as ${req.user.role}`);
    }
  });
  

// 🌐 Routes
app.use('/api/auth', authRoutes);
app.use('/api/feedback', feedbackRoutes);

// 📄 Render Feedback Form (Only for logged-in students)
app.get('/feedback-form', requireLogin, (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).send("Only students can access this form");
  }
  res.render('feedbackForm', { studentName: req.user.name });
});

// 📨 Handle Feedback Form Submit (Now linked to logged-in student)
app.post('/submit-feedback', requireLogin, async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).send("Only students can submit feedback");
  }

  const responses = [];
  const { teacherName, subject, questionCount } = req.body;

  for (let i = 0; i < parseInt(questionCount); i++) {
    responses.push({
      question: `Q${i + 1}`,
      rating: parseInt(req.body[`rating${i}`])
    });
  }

  try {
    const feedback = new Feedback({
      teacherName,
      subject,
      responses,
      submittedBy: req.user.id
    });
    await feedback.save();
    res.send("✅ Feedback submitted successfully!");
  } catch (error) {
    console.error("❌ Feedback Error:", error.message);
    res.status(500).send("❌ Error submitting feedback");
  }
});

// 🚀 Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

app.use(express.static('public'));
app.use('/sample', express.static(__dirname + '/public/sample'));
