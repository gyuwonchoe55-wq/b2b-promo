# E2E 테스트 리포트 — 단체급식 프로모션 신청 서비스

- 테스트 일시: 2026-08-21
- 테스트 방식: Playwright MCP로 실제 브라우저를 구동, 프론트엔드(http://localhost:5173) + 백엔드(http://localhost:3000) 개발 서버 대상 수동 시나리오 기반 E2E
- 대상 문서: `docs/2-PRD.md`, `docs/4-user-scenario.md`
- 스크린샷: `e2e/screenshots/` (파일명 앞자리 숫자 = 아래 표의 순번, `BUG_` 접두사는 결함 재현 화면)

## 1. 결과 요약

| 영역                       | 정상 흐름 | 예외/엣지 케이스                                                                  | 비고                                            |
| -------------------------- | --------- | --------------------------------------------------------------------------------- | ----------------------------------------------- |
| 회원가입/로그인/로그아웃   | ✅ PASS   | ✅ PASS (이메일 중복, 인증 실패)                                                  |                                                 |
| 프로모션 등록              | ✅ PASS   | ✅ PASS (진행일 검증, 필수값 누락)                                                |                                                 |
| 프로모션 목록/상세 조회    | ✅ PASS   | ⚠️ 부분 (존재하지 않는 ID 접근 시 버그 발견)                                      | 목록 없음 케이스는 시드 데이터로 인해 재현 불가 |
| 참가 신청                  | ✅ PASS   | ✅ PASS (마감 후 비활성화, 중복 신청 거부, 정원 마감 거부, 새로고침 후 상태 유지) | BUG-2 수정 완료                                 |
| 신청 취소                  | ✅ PASS   | ✅ PASS (타인 신청 취소 시도 거부 — 코드 재검토로 확인)                           |                                                 |
| 프로모션 수정/삭제         | ✅ PASS   | ✅ PASS (타인 프로모션 수정 거부, 정원 축소 제한, cascade 삭제)                   |                                                 |
| 신청 현황/신청자 목록 확인 | ✅ PASS   | ⚠️ 부분 (타인 프로모션 조회 시 버그 발견)                                         | 신청자 없음 케이스는 정상                       |

2건의 결함을 발견했다(BUG-2는 조치 완료). 상세는 2장 참고.

> **정정 (2026-08-21)**: 최초 리포트에는 "BUG-1 (심각) — 신청 취소 API가 신청자 본인 여부를 검증하지 않음"이 기재되어 있었으나, 백엔드 코드(`backend/src/application/applicationQueries.js`의 `cancel()`)를 재검토하고 기존 테스트(`applicationRoutes.test.js`, `DELETE /api/promotions/:promotionId/applications/me` 스위트, 11개 전부 PASS)를 재실행한 결과 **실제 결함이 아닌 것으로 확인되어 철회**한다. 취소 쿼리는 `WHERE promotion_id = $1 AND user_id = $2`로 이미 소유권을 정확히 검증하며, 타인 신청 취소 시도 시 403을 반환한다. E2E 테스트 당시 pt1787271237 계정이 실제로는 프로모션 190에 이미 신청했었는데(직전 단계에서 190 상세 화면의 "신청하기"를 클릭한 기록이 있음) 이를 "신청한 적 없음"으로 잘못 기록해, 본인 신청을 정상적으로 취소한 것을 타인 신청 삭제로 오인한 테스터 측 기록 오류였다.

### BUG-2 (수정 완료) — 신청 상태 조회가 영양사 전용 API를 호출해 참가자에게 403 발생

- **재현 경로**: 프로모션 상세 페이지가 신청 여부를 확인할 때 `GET /api/promotions/{id}/applications`를 호출하는데, 이 API는 스웨거 명세상 "신청 현황 및 신청자 목록 조회 (영양사 전용, 본인 등록 프로모션만)"이다. 참가자 계정으로 호출 시 `403 Insufficient permissions` 발생
- **영향**: 신청 완료 직후에는 낙관적 업데이트로 "신청 완료/취소" 버튼이 정상 보이지만, 페이지를 새로고침하거나 다시 방문하면 서버 상태 조회가 403으로 실패해 **이미 신청한 프로모션에도 "신청하기" 버튼이 다시 노출**됨. 사용자가 다시 클릭하면 "이미 신청한 프로모션입니다" 오류만 뜨고, 반대로 정원이 마감된 경우엔 "정원 마감" 비활성 버튼이 표시되어 **취소도 할 수 없게 됨**
- **스크린샷 (수정 전)**: `08_BUG_reload_shows_apply_button_again.png`, `09_BUG_cancel_button_missing_after_revisit.png`
- **원인**: 참가자 본인의 신청 여부를 조회하는 API가 백엔드에 없었다. 프론트엔드 `PromotionDetailPage.jsx`는 이를 알고(`ponytail:` 주석으로 명시) 세션 내 로컬 `useState`로만 신청 여부를 추적했는데, 이 상태는 새로고침/재방문 시 초기화되어 실제 신청 여부와 어긋났다.
- **수정 내용**:
  1. 백엔드에 `GET /api/promotions/{promotionId}/applications/me` (PARTICIPANT 전용) 엔드포인트 신설 — `{ applied, appliedAt }` 반환 (`backend/src/application/applicationRoutes.js`, `applicationQueries.js`의 `findByPromotionAndUser`)
  2. `docs/swagger.json`에 `MyApplicationStatus` 스키마와 해당 GET 경로 문서화
  3. 프론트엔드 `applicationApi.js`에 `getMyApplication()` 추가, `PromotionDetailPage.jsx`가 로컬 `useState` 대신 TanStack Query(`['myApplication', id]`)로 신청 여부를 조회하도록 변경, 신청/취소 성공 시 해당 쿼리를 invalidate
  4. 백엔드 테스트에 `GET /applications/me` 스위트 5건 추가 (본인 신청/미신청/타인 무관/404/MANAGER 403) — 전체 16개 테스트 PASS
- **검증**: Playwright로 재현 시나리오(신청 후 상세 페이지 재방문·새로고침)를 다시 실행해 "신청 완료 + 신청 취소" 버튼이 정확히 유지되고 콘솔 에러가 없음을 확인

### BUG-3 — API 에러(403/404) 발생 시 화면이 "로딩 중..."에 무한정 머무름

- **재현 경로 1**: 타 영양사 소유 프로모션의 신청 현황(`/promotions/190/applications`)에 접근 → 403
- **재현 경로 2**: 존재하지 않는 프로모션(`/promotions/999999`) 상세 접근 → 404
- **실제 동작**: 두 경우 모두 "로딩 중..." 문구가 그대로 남고, 같은 요청이 브라우저에서 4회 반복 호출됨(재시도 로직 추정) — 사용자는 오류 원인을 알 수 없고 화면이 멈춘 것처럼 보임
- **기대 동작**: "권한이 없습니다", "존재하지 않는 프로모션입니다" 등 에러 메시지 표시 및 목록으로 돌아가기 유도
- **스크린샷**: `16_BUG_forbidden_applications_stuck_loading.png`, `25_BUG_notfound_promotion_stuck_loading.png`

## 3. 시나리오별 상세 결과 및 스크린샷

### 3.1 회원가입 / 로그인 / 로그아웃

1. 영양사 회원가입 → 가입 즉시 로그인 상태로 목록 화면 진입 — PASS (`01_signup_manager_filled.png`, `02_promotion_list_manager.png`)
2. 이미 사용 중인 이메일로 재가입 시도 → "이미 사용 중인 이메일입니다" 에러 — PASS (`03_signup_duplicate_email_error.png`)
3. 취식자 회원가입 → 등록 버튼 없이 목록만 노출(역할별 UI 분기 정상) — PASS (`04_promotion_list_participant.png`)
4. 잘못된 비밀번호로 로그인 → "이메일 또는 비밀번호가 일치하지 않습니다" — PASS (`10_login_failure.png`)
5. 미인증 상태로 `/promotions` 접근 → `/login`으로 리다이렉트 — PASS (`11_unauth_redirect_to_login.png`)
6. 로그아웃 → 로그인 화면 이동 — PASS

### 3.2 프로모션 조회 (취식자)

1. 목록에서 제목/신청기간/모집인원 확인 — PASS (`04_promotion_list_participant.png`)
2. 상세에서 설명/진행일 확인 — PASS (`05_promotion_detail_participant.png`)
3. 신청 종료일이 지난 프로모션은 "신청 마감" 비활성 버튼 — PASS (`22_promotion_apply_closed_disabled.png`)
4. 존재하지 않는 프로모션 ID 접근 — **BUG-3** 재현 (`25_BUG_notfound_promotion_stuck_loading.png`)
5. "등록된 프로모션 없음" 케이스는 이미 시드 데이터가 존재해 재현 불가 (범위 밖으로 판단)

### 3.3 참가 신청 / 취소 (취식자)

1. 정상 신청 → 1/4명, "신청 완료" + 취소 버튼 노출 — PASS (`06_promotion_apply_success.png`)
2. 같은 프로모션 재신청(중복) → 서버 `409 이미 신청한 프로모션입니다` — PASS (API 레벨 확인)
3. 정원이 가득 찬 프로모션에 신청 → 서버 `400 모집 인원이 마감되었습니다` — PASS (`07_promotion_capacity_full.png`)
4. 페이지 재방문 시 신청 상태가 틀리게 표시됨 → **BUG-2 발견 후 수정 완료** (`08_BUG_...`, `09_BUG_...`는 수정 전 재현 화면)
5. 신청 → 같은 화면에서 즉시 취소 → 0/5명으로 복원 — PASS (`21_application_cancel_success.png`)
6. 신청하지 않은 프로모션 취소 시도 → 403 거부 — PASS (백엔드 코드/테스트 재검토로 확인; 최초 리포트의 "BUG-1"은 테스터 기록 오류로 철회, 1장 정정 내용 참고)

### 3.4 프로모션 등록/수정/삭제 (영양사)

1. 필수값 누락 후 등록 시도 → 브라우저 기본 유효성 검사로 제출 차단 — PASS (`12_promotion_create_missing_required.png`)
2. 진행일이 신청 종료일보다 이전 → "진행일은 신청 종료일 이후여야 합니다" — PASS (`13_promotion_create_invalid_date.png`)
3. 정상 등록 → 목록에 노출 — PASS
4. 타인이 등록한 프로모션 수정 시도 → "등록자 본인만 수정할 수 있습니다" — PASS (`17_edit_other_manager_forbidden.png`) — 단, 수정 폼 자체는 소유자 검증 없이 로드됨 (사소한 UX 이슈, 저장 시점에는 정상 차단)
5. 신청자가 있는 프로모션의 정원을 신청 인원 미만으로 축소 → 서버 `400 모집 인원을 현재 신청 인원 미만으로 축소할 수 없습니다` — PASS (API 레벨 확인; UI의 `min=1` 제약으로 0명 케이스는 폼에서 직접 재현되지 않음)
6. 신청자가 있는 프로모션 삭제 → "신청 기록도 함께 삭제됩니다. 삭제하시겠습니까?" 확인 다이얼로그 → 확인 시 목록에서 사라짐(cascade 삭제) — PASS (`20_promotion_deleted_list.png`)
7. 아직 신청 시작 전(신청기간 이전)인 본인 프로모션에 참가자가 신청 시도 → 서버 `400 신청 기간이 아닙니다` — PASS (부가 발견, 정상 동작)

### 3.5 신청 현황 확인 (영양사)

1. 신청자 없는 프로모션 → "신청자 없음" — PASS (`15_application_status_empty.png`)
2. 신청자가 있는 프로모션 → 이름/신청일시 테이블 노출 — PASS (`18_application_status_with_applicant.png`)
3. 타 영양사 소유 프로모션의 신청 현황 조회 시도 → **BUG-3** (403 후 무한 로딩) (`16_BUG_forbidden_applications_stuck_loading.png`)

### 3.6 반응형 확인

- 모바일 뷰포트(390×844)에서 목록/상세 레이아웃 정상 표시 — PASS (`23_mobile_promotion_list.png`, `24_mobile_promotion_detail.png`)

## 4. 테스트에 사용한 계정/데이터

| 이메일                  | 역할        | 용도                                    |
| ----------------------- | ----------- | --------------------------------------- |
| mgr1787271237@test.com  | MANAGER     | 프로모션 등록/수정/삭제/신청현황 테스트 |
| pt1787271237@test.com   | PARTICIPANT | 신청/취소/중복신청/BUG-1 재현           |
| pt2_1787271237@test.com | PARTICIPANT | 정원마감/정원축소 테스트용 보조 계정    |

테스트로 생성한 프로모션(195, 197)과 계정은 정리하지 않고 그대로 두었다(운영 데이터가 아닌 로컬 개발 DB).

## 5. 권장 조치 우선순위

1. **BUG-3** — React Query 등에서 4xx 에러 시 재시도를 끄고, 에러 상태 UI(메시지 + 목록으로 돌아가기)를 추가

(BUG-1은 철회됨 — 1장 정정 내용 참고, 코드 수정 없음. BUG-2는 2장에 기술한 대로 수정 완료.)
