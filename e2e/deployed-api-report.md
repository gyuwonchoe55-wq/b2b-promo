# 배포 백엔드 E2E 테스트 리포트

- 대상: `https://b2bpro-121-be.vercel.app/api` (Vercel 배포)
- 방식: `docs/4-user-scenario.md` 기준 시나리오를 API 레벨로 직접 호출 (`e2e/api-e2e.js`, Node 내장 fetch, 추가 의존성 없음)
- 실행: `node e2e/api-e2e.js https://b2bpro-121-be.vercel.app`
- 결과: 총 34건 중 PASS 31 / FAIL 3

## 발견된 결함

**`GET /api/promotions/{promotionId}/applications/me` 가 배포 백엔드에서 404**

- 회원가입/로그인/신청/신청현황/취소/cascade 삭제 등 나머지 전 시나리오는 정상 동작.
- 로컬 코드(`backend/src/application/applicationRoutes.js:76`)에는 해당 라우트가 있으나, `git status` 확인 결과 이 파일이 아직 커밋되지 않은 변경 상태(`M`)다. 배포된 커밋(HEAD)에는 `DELETE /me`만 있고 `GET /me`는 없다 — 즉 이전 리포트(`e2e/report.md`)의 BUG-2 수정이 로컬에만 존재하고 배포에는 반영되지 않았다.
- 영향: 배포 프론트엔드가 이 API를 호출한다면(BUG-2 수정 내용대로) 신청 상태 조회가 항상 404로 실패한다.
- 조치: `applicationQueries.js`, `applicationRoutes.js`, `applicationRoutes.test.js`, `docs/swagger.json` 변경분을 커밋 후 재배포 필요.

## 커버한 시나리오 (PASS)

- 회원가입(영양사/취식자), 이메일 중복 409, 로그인 실패 401, refresh token 재발급
- 미인증 접근 401
- 프로모션 등록(영양사 성공 / 취식자 403 / 진행일 검증 400 / 필수값 누락 400)
- 목록/상세 조회, 존재하지 않는 ID 404
- 타인 프로모션 수정/삭제 403
- 참가 신청(성공/중복 409/영양사 403), 정원 마감 400
- 신청 현황 조회(등록자 200 / 타인 403)
- 정원 축소 제한 400
- 신청 취소(본인 204 / 타인 시도 403)
- 신청자 있는 프로모션 cascade 삭제 204
