const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { findByEmail, create } = require('./userQueries');

const router = express.Router();

router.post('/signup', async (req, res, next) => {
  const { name, email, password, role } = req.body;

  if (role !== 'MANAGER' && role !== 'PARTICIPANT') {
    const err = new Error('role은 MANAGER 또는 PARTICIPANT여야 합니다');
    err.statusCode = 400;
    return next(err);
  }

  if (!name || !email || !password) {
    const err = new Error('name, email, password는 필수입니다');
    err.statusCode = 400;
    return next(err);
  }

  try {
    const existing = await findByEmail(email);
    if (existing) {
      const err = new Error('이미 사용 중인 이메일입니다');
      err.statusCode = 409;
      return next(err);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await create({ name, email, passwordHash, role });

    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const user = await findByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      const err = new Error('이메일 또는 비밀번호가 일치하지 않습니다');
      err.statusCode = 401;
      return next(err);
    }

    const payload = { id: user.id, role: user.role };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    const err = new Error('refreshToken이 필요합니다');
    err.statusCode = 401;
    return next(err);
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
  } catch (error) {
    const err = new Error('유효하지 않은 refresh token입니다');
    err.statusCode = 401;
    return next(err);
  }

  const payload = { id: decoded.id, role: decoded.role };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });

  res.json({ accessToken });
});

module.exports = router;
