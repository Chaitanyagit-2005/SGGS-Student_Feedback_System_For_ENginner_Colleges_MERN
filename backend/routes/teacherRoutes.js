const express = require('express');
const router = express.Router();
const Subject = require('../models/Subject');
const Feedback = require('../models/Feedback');
const { requireLogin } = require('../middleware/authMiddleware');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');

// ===============================
// 🧑‍🏫 TEACHER DASHBOARD with Feedback Summary
// ===============================
router.get('/dashboard', requireLogin, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).send("Access denied");

  try {
    const subjects = await Subject.find({ teacher: req.user._id });

    const subjectsWithStats = [];

    for (const subject of subjects) {
      const feedbacks = await Feedback.find({ subject: subject._id });

      let total = feedbacks.length;
      let avg = 0;

      if (total > 0) {
        let totalScore = 0;
        let count = 0;

        feedbacks.forEach(fb => {
          fb.responses.forEach(r => {
            totalScore += r.rating;
            count++;
          });
        });

        avg = (totalScore / count).toFixed(2);
      }

      subjectsWithStats.push({
        ...subject._doc,
        totalFeedbacks: total,
        avgRating: avg
      });
    }

    res.render('teacher/dashboard', {
      user: req.user,
      subjects: subjectsWithStats
    });
  } catch (err) {
    console.error("Error loading teacher dashboard:", err.message);
    res.status(500).send("Error loading dashboard.");
  }
});

// ===============================
// 📋 View Individual Feedbacks for a Subject
// ===============================
router.get('/subject-feedback/:id', requireLogin, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).send("Access denied");

  try {
    const feedbacks = await Feedback.find({ subject: req.params.id })
      .populate('submittedBy', 'name email');

    res.render('teacher/subjectFeedback', {
      user: req.user,
      feedbacks
    });
  } catch (err) {
    console.error("Error loading subject feedbacks:", err.message);
    res.status(500).send("Error loading feedbacks.");
  }
});

// ===============================
// 📥 Export Feedback as CSV
// ===============================
router.get('/export-feedback/:subjectId', requireLogin, async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ subject: req.params.subjectId }).populate('submittedBy');

    const data = feedbacks.flatMap(fb =>
      fb.responses.map(r => ({
        subjectId: req.params.subjectId,
        student: fb.submittedBy?.name || 'N/A',
        email: fb.submittedBy?.email || 'N/A',
        question: r.question,
        rating: r.rating
      }))
    );

    const csv = new Parser().parse(data);
    res.header('Content-Type', 'text/csv');
    res.attachment(`feedback-${req.params.subjectId}.csv`);
    return res.send(csv);
  } catch (err) {
    console.error("Export CSV Error:", err.message);
    res.status(500).send("❌ Failed to export CSV.");
  }
});

// ===============================
// 📄 Export Feedback as PDF
// ===============================
router.get('/export-pdf/:subjectId', requireLogin, async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ subject: req.params.subjectId }).populate('submittedBy');

    const doc = new PDFDocument();
    res.setHeader('Content-Disposition', 'attachment; filename=feedback-report.pdf');
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(18).text("📄 Feedback Report", { align: 'center' }).moveDown();

    feedbacks.forEach((fb, i) => {
      doc.fontSize(12).text(`Student: ${fb.submittedBy?.name || 'Anonymous'} (${fb.submittedBy?.email || 'N/A'})`);
      fb.responses.forEach(r => {
        doc.text(`- ${r.question}: ${r.rating} / 5`);
      });
      doc.moveDown();
    });

    doc.end();
  } catch (err) {
    console.error("Export PDF Error:", err.message);
    res.status(500).send("❌ Failed to export PDF.");
  }
});

module.exports = router;
