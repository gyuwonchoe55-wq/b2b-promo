# 배포 백엔드 E2E 테스트 리포트

- 대상: `https://b2bpro-121-be.vercel.app/api` (Vercel 배포)
- 방식: `docs/4-user-scenario.md` 기준 시나리오를 API 레벨로 직접 호출 (`e2e/api-e2e.js`, Node 내장 fetch, 추가 의존성 없음)
- 실행: `node e2e/api-e2e.js https://b2bpro-121-be.vercel.app`
- 결과: 총 34건 중 PASS 34 / FAIL 0 (최초 실행은 31/3, 아래 결함 수정·재배포 후 재실행하여 전건 통과)

## 발견 후 수정된 결함

**`GET /api/promotions/{promotionId}/applications/me` 가 배포 백엔드에서 404**

- 최초 실행 시 회원가입/로그인/신청/신청현황/취소/cascade 삭제 등 나머지 시나리오는 모두 정상 동작했으나, 이 엔드포인트만 404.
- 원인: 로컬 코드(`backend/src/application/applicationRoutes.js:76`)에는 해당 라우트(BUG-2 수정분)가 있었지만 커밋되지 않아 배포에 반영되지 않은 상태였음.
- 조치: `applicationQueries.js`, `applicationRoutes.js`, `applicationRoutes.test.js`, `docs/swagger.json` 변경분을 커밋·push하여 재배포, 재실행으로 34/34 전건 통과 확인.

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
