const jwt = require('jsonwebtoken');
const User = require('../models/User');

const requireLogin = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.redirect('/login');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    next();
  } catch (err) {
    return res.redirect('/login');
  }
};

module.exports = { requireLogin };
