const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const err = new Error('Authentication token is required');
    err.statusCode = 401;
    return next(err);
  }

  const token = authHeader.slice('Bearer '.length);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (error) {
    const err = new Error('Invalid or expired token');
    err.statusCode = 401;
    next(err);
  }
}

function requireRole(...roles) {
  return function (req, res, next) {
    if (!roles.includes(req.user.role)) {
      const err = new Error('Insufficient permissions');
      err.statusCode = 403;
      return next(err);
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
