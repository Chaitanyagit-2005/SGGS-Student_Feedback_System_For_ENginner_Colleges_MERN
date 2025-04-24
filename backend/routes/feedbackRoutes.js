const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const jwt = require('jsonwebtoken');

// Middleware to verify token
function verifyToken(req, res, next) {
    const token = req.headers.authorization;
    if (!token) return res.status(403).json({ error: "No token" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: "Invalid token" });
    }
}

// 📥 Submit feedback (STUDENT)
router.post('/submit', verifyToken, async (req, res) => {
    const { teacherName, subject, responses } = req.body;
    try {
        const feedback = new Feedback({
            teacherName,
            subject,
            submittedBy: req.user.id,
            responses
        });
        await feedback.save();
        res.json({ message: "Feedback submitted successfully", feedback });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 📤 Get all feedbacks (TEACHER/ADMIN)
router.get('/all', verifyToken, async (req, res) => {
    try {
        if (req.user.role === 'teacher' || req.user.role === 'admin') {
            const feedbacks = await Feedback.find().populate('submittedBy', 'name email');
            res.json(feedbacks);
        } else {
            res.status(403).json({ error: "Unauthorized" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
