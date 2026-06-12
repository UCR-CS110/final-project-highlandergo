const User = require('../models/User');

async function isNotBanned(req, res, next) {
  try {
      const user = await User.findById(req.session.userId).select('banned');
      if(user?.banned){
        return res.status(403).json({ error: 'Your account has been banned.' });
      }
      next();
  } catch (err) {
      next(err);
  }
}

module.exports = isNotBanned;
