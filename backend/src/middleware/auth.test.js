process.env.JWT_SECRET = 'test-secret';

const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const { authenticate, requireRole } = require('./auth');

function makeReq(headers = {}) {
  return { headers };
}

function makeNextRecorder() {
  const calls = [];
  const next = (err) => calls.push(err);
  return { next, calls };
}

test('authenticate: 유효한 토큰이면 req.user를 설정하고 인자 없이 next() 호출', () => {
  const token = jwt.sign({ id: 1, role: 'MANAGER' }, process.env.JWT_SECRET);
  const req = makeReq({ authorization: `Bearer ${token}` });
  const { next, calls } = makeNextRecorder();

  authenticate(req, {}, next);

  assert.deepStrictEqual(req.user, { id: 1, role: 'MANAGER' });
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0], undefined);
});

test('authenticate: Authorization 헤더가 없으면 401 에러로 next 호출', () => {
  const req = makeReq({});
  const { next, calls } = makeNextRecorder();

  authenticate(req, {}, next);

  assert.strictEqual(calls.length, 1);
  assert.ok(calls[0]);
  assert.strictEqual(calls[0].statusCode, 401);
});

test('authenticate: "Bearer " prefix가 없으면 401 에러로 next 호출', () => {
  const req = makeReq({ authorization: 'Basic abcdef' });
  const { next, calls } = makeNextRecorder();

  authenticate(req, {}, next);

  assert.strictEqual(calls.length, 1);
  assert.ok(calls[0]);
  assert.strictEqual(calls[0].statusCode, 401);
});

test('authenticate: 다른 시크릿으로 서명된 위조 토큰이면 401 에러로 next 호출', () => {
  const forged = jwt.sign({ id: 1, role: 'MANAGER' }, 'wrong-secret');
  const req = makeReq({ authorization: `Bearer ${forged}` });
  const { next, calls } = makeNextRecorder();

  authenticate(req, {}, next);

  assert.strictEqual(calls.length, 1);
  assert.ok(calls[0]);
  assert.strictEqual(calls[0].statusCode, 401);
});

test('authenticate: 만료된 토큰이면 401 에러로 next 호출', () => {
  const expired = jwt.sign({ id: 1, role: 'MANAGER' }, process.env.JWT_SECRET, { expiresIn: '-1s' });
  const req = makeReq({ authorization: `Bearer ${expired}` });
  const { next, calls } = makeNextRecorder();

  authenticate(req, {}, next);

  assert.strictEqual(calls.length, 1);
  assert.ok(calls[0]);
  assert.strictEqual(calls[0].statusCode, 401);
});

test('requireRole: 허용된 role이면 인자 없이 next() 호출', () => {
  const req = { user: { id: 1, role: 'MANAGER' } };
  const { next, calls } = makeNextRecorder();

  requireRole('MANAGER')(req, {}, next);

  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0], undefined);
});

test('requireRole: 허용되지 않은 role이면 403 에러로 next 호출', () => {
  const req = { user: { id: 1, role: 'PARTICIPANT' } };
  const { next, calls } = makeNextRecorder();

  requireRole('MANAGER')(req, {}, next);

  assert.strictEqual(calls.length, 1);
  assert.ok(calls[0]);
  assert.strictEqual(calls[0].statusCode, 403);
});
