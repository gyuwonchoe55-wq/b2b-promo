// 배포된 백엔드(docs/4-user-scenario.md 기준) API 레벨 E2E 스모크 테스트.
// 실행: node e2e/api-e2e.js [baseUrl]
const BASE = (process.argv[2] || 'https://b2bpro-121-be.vercel.app') + '/api';
const stamp = process.env.E2E_STAMP || String(Date.now());

let pass = 0;
let fail = 0;
const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}${detail ? ' :: ' + detail : ''}`);
}

async function req(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : undefined; } catch { json = text; }
  return { status: res.status, json };
}

function expect(name, cond, detail) {
  record(name, !!cond, detail);
}

function futureDate(days) {
  const d = new Date(Date.now() + days * 86400000);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const mgrEmail = `mgr_${stamp}@e2e.test`;
  const ptEmail = `pt_${stamp}@e2e.test`;
  const pt2Email = `pt2_${stamp}@e2e.test`;
  const password = 'password123';

  // 1. 회원가입/로그인
  let r = await req('POST', '/auth/signup', { body: { name: '매니저', email: mgrEmail, password, role: 'MANAGER' } });
  expect('회원가입(영양사) 201', r.status === 201, `status=${r.status}`);

  r = await req('POST', '/auth/signup', { body: { name: '매니저', email: mgrEmail, password, role: 'MANAGER' } });
  expect('중복 이메일 회원가입 409', r.status === 409, `status=${r.status}`);

  r = await req('POST', '/auth/signup', { body: { name: '취식자', email: ptEmail, password, role: 'PARTICIPANT' } });
  expect('회원가입(취식자) 201', r.status === 201, `status=${r.status}`);

  r = await req('POST', '/auth/signup', { body: { name: '취식자2', email: pt2Email, password, role: 'PARTICIPANT' } });
  expect('회원가입(취식자2) 201', r.status === 201, `status=${r.status}`);

  r = await req('POST', '/auth/login', { body: { email: mgrEmail, password: 'wrong-password' } });
  expect('잘못된 비밀번호 로그인 401', r.status === 401, `status=${r.status}`);

  r = await req('POST', '/auth/login', { body: { email: mgrEmail, password } });
  expect('로그인(영양사) 200 + accessToken', r.status === 200 && r.json?.accessToken, `status=${r.status}`);
  const mgrToken = r.json?.accessToken;
  const mgrRefresh = r.json?.refreshToken;

  r = await req('POST', '/auth/login', { body: { email: ptEmail, password } });
  expect('로그인(취식자) 200 + accessToken', r.status === 200 && r.json?.accessToken, `status=${r.status}`);
  const ptToken = r.json?.accessToken;

  r = await req('POST', '/auth/login', { body: { email: pt2Email, password } });
  expect('로그인(취식자2) 200 + accessToken', r.status === 200 && r.json?.accessToken, `status=${r.status}`);
  const pt2Token = r.json?.accessToken;

  r = await req('POST', '/auth/refresh', { body: { refreshToken: mgrRefresh } });
  expect('refresh token으로 access token 재발급 200', r.status === 200 && r.json?.accessToken, `status=${r.status}`);

  // 2. 인증 없이 접근
  r = await req('GET', '/promotions');
  expect('미인증 목록 조회 401', r.status === 401, `status=${r.status}`);

  // 3. 프로모션 등록 (영양사)
  const basePromo = {
    title: `E2E 프로모션 ${stamp}`,
    description: 'E2E 테스트용 프로모션',
    applyStartAt: futureDate(-1),
    applyEndAt: futureDate(1),
    eventDate: futureDate(1),
    capacity: 2,
  };

  r = await req('POST', '/promotions', { token: ptToken, body: basePromo });
  expect('취식자의 프로모션 등록 403', r.status === 403, `status=${r.status}`);

  r = await req('POST', '/promotions', { token: mgrToken, body: { ...basePromo, eventDate: futureDate(-2) } });
  expect('진행일 < 신청종료일 등록 400', r.status === 400, `status=${r.status}`);

  r = await req('POST', '/promotions', { token: mgrToken, body: { title: '', description: '', applyStartAt: '', applyEndAt: '', eventDate: '', capacity: undefined } });
  expect('필수값 누락 등록 400', r.status === 400, `status=${r.status}`);

  r = await req('POST', '/promotions', { token: mgrToken, body: basePromo });
  expect('프로모션 등록(영양사) 201', r.status === 201, `status=${r.status}`);
  const promoId = r.json?.id;

  // 4. 목록/상세 조회
  r = await req('GET', '/promotions', { token: ptToken });
  expect('목록 조회 200 (배열)', r.status === 200 && Array.isArray(r.json), `status=${r.status}`);

  r = await req('GET', `/promotions/${promoId}`, { token: ptToken });
  expect('상세 조회 200', r.status === 200 && r.json?.id === promoId, `status=${r.status}`);

  r = await req('GET', '/promotions/999999999', { token: ptToken });
  expect('존재하지 않는 프로모션 조회 404', r.status === 404, `status=${r.status}`);

  // 5. 타인 소유 프로모션 수정/삭제 거부
  r = await req('PATCH', `/promotions/${promoId}`, { token: ptToken, body: { title: '변경 시도' } });
  expect('타인(취식자)의 프로모션 수정 403', r.status === 403, `status=${r.status}`);

  r = await req('DELETE', `/promotions/${promoId}`, { token: ptToken });
  expect('타인(취식자)의 프로모션 삭제 403', r.status === 403, `status=${r.status}`);

  // 6. 참가 신청
  r = await req('POST', `/promotions/${promoId}/applications`, { token: mgrToken });
  expect('영양사의 참가 신청 403', r.status === 403, `status=${r.status}`);

  r = await req('POST', `/promotions/${promoId}/applications`, { token: ptToken });
  expect('참가 신청(취식자) 201', r.status === 201, `status=${r.status}`);

  r = await req('POST', `/promotions/${promoId}/applications`, { token: ptToken });
  expect('중복 신청 409', r.status === 409, `status=${r.status}`);

  r = await req('GET', `/promotions/${promoId}/applications/me`, { token: ptToken });
  expect('내 신청 여부 조회 200 (applied=true)', r.status === 200 && r.json?.applied === true, `status=${r.status}`);

  r = await req('GET', `/promotions/${promoId}/applications/me`, { token: mgrToken });
  expect('영양사의 내 신청 여부 조회 403', r.status === 403, `status=${r.status}`);

  // 7. 정원 마감
  r = await req('POST', `/promotions/${promoId}/applications`, { token: pt2Token });
  expect('두 번째 취식자 신청 201 (정원 2/2 채움)', r.status === 201, `status=${r.status}`);

  r = await req('POST', '/auth/signup', { body: { name: '취식자3', email: `pt3_${stamp}@e2e.test`, password, role: 'PARTICIPANT' } });
  const pt3Login = await req('POST', '/auth/login', { body: { email: `pt3_${stamp}@e2e.test`, password } });
  const pt3Token = pt3Login.json?.accessToken;
  r = await req('POST', `/promotions/${promoId}/applications`, { token: pt3Token });
  expect('정원 마감 후 신청 400', r.status === 400, `status=${r.status}`);

  // 8. 신청 현황 조회 (영양사)
  r = await req('GET', `/promotions/${promoId}/applications`, { token: ptToken });
  expect('취식자의 신청 현황 조회 403', r.status === 403, `status=${r.status}`);

  r = await req('GET', `/promotions/${promoId}/applications`, { token: mgrToken });
  expect('신청 현황 조회(등록자) 200, 신청자 2명', r.status === 200 && r.json?.applicants?.length === 2, `status=${r.status} applicants=${r.json?.applicants?.length}`);

  // 9. 정원 축소 제한 (신청 인원 2명 미만으로 축소 시도)
  r = await req('PATCH', `/promotions/${promoId}`, { token: mgrToken, body: { capacity: 1 } });
  expect('신청 인원 미만으로 정원 축소 400', r.status === 400, `status=${r.status}`);

  // 10. 신청 취소
  r = await req('DELETE', `/promotions/${promoId}/applications/me`, { token: pt3Token });
  expect('신청하지 않은 프로모션 취소 403', r.status === 403, `status=${r.status}`);

  r = await req('DELETE', `/promotions/${promoId}/applications/me`, { token: ptToken });
  expect('신청 취소(본인) 204', r.status === 204, `status=${r.status}`);

  r = await req('GET', `/promotions/${promoId}/applications/me`, { token: ptToken });
  expect('취소 후 내 신청 여부 조회 200 (applied=false)', r.status === 200 && r.json?.applied === false, `status=${r.status}`);

  // 11. cascade 삭제 (신청자 남은 상태에서 삭제)
  r = await req('DELETE', `/promotions/${promoId}`, { token: mgrToken });
  expect('프로모션 삭제(등록자, cascade) 204', r.status === 204, `status=${r.status}`);

  r = await req('GET', `/promotions/${promoId}`, { token: mgrToken });
  expect('삭제된 프로모션 조회 404', r.status === 404, `status=${r.status}`);

  console.log(`\n총 ${pass + fail}건 중 PASS ${pass} / FAIL ${fail}`);
  if (fail > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('E2E 실행 중 예외 발생:', err);
  process.exitCode = 1;
});
