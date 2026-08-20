# 프로젝트 구조 설계 원칙

> 1인 개발, 3일 일정의 초소형 MVP. 코드 작성 전 참고용 아키텍처/컨벤션 가이드다. 확정된 요구사항(CLAUDE.md, doc/1~4)을 재논의하지 않는다.

---

## 1. 모든 스택에 공통인 최상위 원칙

- **오버엔지니어링 금지가 최우선.** CLAUDE.md 명시 사항이며, 이 문서의 모든 판단 기준이다.
- **YAGNI.** 지금 필요 없는 확장성(멀티 테넌트, 권한 세분화, 국제화 등)은 만들지 않는다.
- **도메인 3개(User/Promotion/Application) 중심 설계.** 테이블, 폴더, 모듈 구조 모두 이 3개를 기준으로만 나눈다. 그 외 추상 개념(예: "엔티티 베이스 클래스", "제네릭 리포지토리")을 만들지 않는다.
- **단순함이 정답.** 같은 문제를 해결하는 두 방법 중 코드가 적은 쪽을 택한다. 디자인 패턴은 필요가 확실할 때만 쓴다.
- **원자적 DB 쿼리로 동시성 해결.** 정원 초과 검증은 애플리케이션 락이 아니라 `UPDATE ... WHERE` 단일 쿼리로 처리한다(PRD 8장 기준).
- **P0 먼저, P1은 여유 있을 때만.** 일정이 밀리면 P1(수정/삭제, 신청 현황)부터 축소한다.

---

## 2. 의존성/레이어 원칙

대기업식 다층 아키텍처(DDD, 헥사고날, CQRS)는 도입하지 않는다. 딱 필요한 최소 레이어만 둔다.

### 프론트엔드 (3레이어)

```
화면(컴포넌트/페이지) → API 호출(TanStack Query 훅) → 전역 상태(Zustand, 로그인 사용자 정보만)
```

- 컴포넌트는 UI만 담당하고 fetch 로직을 직접 넣지 않는다.
- 서버 데이터는 전부 TanStack Query가 캐싱/갱신하며, Zustand는 로그인 사용자 정보 등 화면 간 공유가 꼭 필요한 최소 상태만 담는다.
- 별도의 "서비스 레이어", "리포지토리 레이어" 같은 추상화는 만들지 않는다. API 호출 함수 하나면 충분하다.

### 백엔드 (3레이어)

```
라우터(요청/응답, 인증 검사) → 컨트롤러 겸 서비스(비즈니스 로직) → DB 접근(pg 쿼리 함수)
```

- 컨트롤러와 서비스는 규모상 굳이 분리하지 않고 하나로 합친다(라우트 핸들러 = 비즈니스 로직).
- DB 접근 함수만 별도 모듈로 분리해 SQL을 한 곳에 모은다(재사용 및 가독성 목적).
- 도메인별(user/promotion/application) 폴더 안에서만 레이어를 나누고, 레이어 간 교차 참조는 같은 도메인 내에서만 허용한다.

---

## 3. 코드/네이밍 원칙

React 19 + Node/Express 생태계의 일반 컨벤션을 따르며, 별도 규칙을 추가하지 않는다.

| 대상 | 컨벤션 | 예시 |
| --- | --- | --- |
| React 컴포넌트 파일/함수 | PascalCase | `PromotionCard.jsx`, `PromotionCard()` |
| 훅 | camelCase, `use` 접두사 | `usePromotions.js` |
| 일반 JS 파일(라우터/컨트롤러/유틸) | camelCase | `promotionRoutes.js` |
| 변수/함수 | camelCase | `getApplicationCount` |
| DB 테이블명 | snake_case, 복수형 | `users`, `promotions`, `applications` |
| DB 컬럼명 | snake_case | `recruit_count`, `applied_at` |
| JS 객체 키(응답 DTO) | camelCase (DB snake_case → 응답 시 변환) | `recruitCount` |
| 상수(역할 등) | UPPER_SNAKE_CASE | `MANAGER`, `PARTICIPANT` |

- 파일당 하나의 컴포넌트/라우터 모듈 원칙(과도한 분할은 금지, 도메인당 파일 1~2개면 충분).

---

## 4. 테스트/품질 원칙

정식 테스트 피라미드나 커버리지 목표는 두지 않는다. **핵심 비즈니스 로직에 한정**해서만 검증한다.

- 테스트 대상은 아래로 한정한다.
  - 중복 신청 방지 로직
  - 정원 초과 검증 로직(동시 신청 포함)
  - 진행일 ≥ 신청 종료일 검증
  - 정원 축소 제한(신청자 존재 시) 검증
- 위 항목은 DB 쿼리/서비스 함수 단위로 간단한 스크립트 또는 최소 단위 테스트(예: Node 내장 `node:test`)로 확인한다. 별도 테스트 프레임워크 도입은 지양한다.
- 그 외 CRUD, UI 컴포넌트는 수동 확인(직접 클릭/API 호출)으로 충분하며 테스트 코드를 작성하지 않는다.
- E2E, 커버리지 리포트, CI 테스트 게이트는 이번 범위에서 만들지 않는다.

---

## 5. 설정/보안/운영 원칙

- **환경변수**: `.env` 파일로 관리(DB 접속 정보, JWT 시크릿, 포트). `.env`는 git에 커밋하지 않고 `.env.example`만 둔다.
- **JWT**: access token은 짧은 만료, refresh token은 긴 만료로 발급. refresh token은 PRD대로 무상태 처리하며 별도 저장/무효화 테이블을 두지 않는다. 로그아웃은 클라이언트가 토큰을 폐기하는 방식으로 처리한다.
- **비밀번호**: bcrypt로 해시 저장, 평문 저장/로깅 금지.
- **CORS**: 프론트(React)와 백엔드(Express)가 별도 오리진으로 서빙되므로 `cors` 미들웨어로 프론트 오리진만 허용한다. 별도 게이트웨이/프록시 구성은 만들지 않는다.
- **에러 처리**: Express 에러 핸들링 미들웨어 1개로 통일해 상태 코드와 메시지를 일관되게 반환한다. 도메인별 커스텀 에러 클래스 계층은 만들지 않는다.
- **로그**: `console.log`/`console.error` 수준이면 충분하다. 별도 로깅 라이브러리(winston 등) 도입은 이 규모에서 과함.
- **배포**: 별도 인프라 예산이 없으므로 로컬 실행 또는 최소 비용 PaaS(예: 단일 VM, 무료/저가 티어) 전제로 한다. 컨테이너 오케스트레이션, 멀티 서버 구성은 만들지 않는다.

---

## 6. 디렉토리 구조

### 프론트엔드 (React 19 + Zustand + TanStack Query)

```
frontend/
  src/
    api/                # 도메인별 API 호출 함수 (fetch + TanStack Query 훅)
      authApi.js
      promotionApi.js
      applicationApi.js
    store/               # Zustand 전역 상태 (로그인 사용자 정보 등 최소한)
      authStore.js
    pages/               # 라우트 단위 화면
      LoginPage.jsx
      SignupPage.jsx
      PromotionListPage.jsx
      PromotionDetailPage.jsx
      PromotionFormPage.jsx      # 등록/수정 공용
      ApplicationStatusPage.jsx   # 영양사 신청 현황
    components/          # 여러 페이지에서 재사용하는 UI 조각
      PromotionCard.jsx
      Header.jsx
    App.jsx
    main.jsx
```

### 백엔드 (Node.js + Express + pg)

```
backend/
  src/
    db/
      pool.js              # pg Pool 연결 설정
                            # 테이블 생성 스크립트(DDL)는 `../../docs/8-schema.sql`에 둔다
    user/
      userRoutes.js         # 회원가입/로그인 라우터 + 컨트롤러 겸 서비스
      userQueries.js         # pg 쿼리 함수
    promotion/
      promotionRoutes.js
      promotionQueries.js
    application/
      applicationRoutes.js
      applicationQueries.js
    middleware/
      auth.js               # JWT 검증, req.user 주입
      errorHandler.js        # 공통 에러 핸들링
    app.js                  # Express 앱 조립, 라우터 등록
    server.js               # 서버 실행 진입점
  .env.example
```

- 도메인 3개(user/promotion/application) 폴더 구조를 프론트/백엔드 모두 동일하게 대응시켜 어느 파일이 어느 도메인 것인지 바로 알 수 있게 한다.
- 폴더 뎁스는 2단계(도메인 폴더 → 파일)를 넘기지 않는다.
