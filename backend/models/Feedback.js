const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    teacherName: String,
    subject: String,
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    responses: [
        {
            question: String,
            rating: Number // 1 to 5
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
