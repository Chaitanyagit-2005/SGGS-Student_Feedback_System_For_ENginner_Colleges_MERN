const express = require('express');
const router = express.Router();
const Subject = require('../models/Subject');
const Feedback = require('../models/Feedback');
const Department = require('../models/Department');
const { requireLogin } = require('../middleware/authMiddleware');

// ==========================
// 📘 Student Dashboard
// ==========================
router.get('/dashboard', requireLogin, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).send("Access denied");

  try {
    const submittedSubjectIds = await Feedback
      .find({ submittedBy: req.user._id })
      .distinct('subject');

    const subjects = await Subject.find({
      published: true,
      department: req.user.department,
      year: req.user.year,
      _id: { $nin: submittedSubjectIds }
    }).populate('teacher');

    res.render('student/dashboard', { user: req.user, subjects });
  } catch (err) {
    console.error("Dashboard Error:", err.message);
    res.status(500).send("Error loading dashboard.");
  }
});

// ==========================
// 📘 Submit Feedback
// ==========================
router.post('/submit-feedback', requireLogin, async (req, res) => {
  const { subjectId, responses } = req.body;

  try {
    const already = await Feedback.findOne({
      subject: subjectId,
      submittedBy: req.user._id
    });

    if (already) {
      return res.json({ success: false, message: "⚠️ You already submitted feedback for this subject." });
    }

    const parsed = JSON.parse(responses);

    await Feedback.create({
      teacherName: parsed.teacherName,
      subject: subjectId,
      responses: parsed.questions,
      submittedBy: req.user._id
    });

    return res.json({ success: true, message: "✅ Feedback submitted successfully!" });
  } catch (err) {
    console.error("Feedback submission error:", err.message);
    return res.status(500).json({ success: false, message: "❌ Failed to submit feedback." });
  }
});


// ==========================
// 📘 View Submitted Feedbacks
// ==========================
router.get('/my-feedbacks', requireLogin, async (req, res) => {
  try {
    const feedbacks = await Feedback
      .find({ submittedBy: req.user._id })
      .populate('subject');

    res.render('student/myFeedbacks', { user: req.user, feedbacks });
  } catch (err) {
    console.error("My Feedbacks Error:", err.message);
    res.status(500).send("Error loading your feedbacks.");
  }
});

module.exports = router;
