const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// Register

router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    const exists = await User.findOne({ email });
    if (exists) return res.send("⚠️ User already exists");

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      // department & year not assigned here if student
    });

    res.redirect('/login');
  } catch (err) {
    console.error("Registration error:", err.message);
    res.status(500).send("❌ Registration failed.");
  }
});


// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ message: "Login success", token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/login');
  });
  
  module.exports = router;