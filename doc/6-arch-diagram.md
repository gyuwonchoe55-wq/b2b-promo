# 기술 아키텍처 다이어그램

> 1인 개발 3일 MVP 기준. 실제 존재하는 컴포넌트(브라우저, React 프론트, Express 백엔드 1개, PostgreSQL 1개)만 표현한다.

## 1. 전체 시스템 구성도

브라우저에서 실행되는 React 앱이 Express 백엔드에 REST API로 요청하고, 백엔드가 PostgreSQL에 직접 쿼리하는 단순 3단 구성이다.

```mermaid
flowchart LR
    Browser["브라우저<br/>React 19 + Zustand<br/>+ TanStack Query"]
    Backend["Express 백엔드<br/>REST API / JWT 인증 / CORS"]
    DB[("PostgreSQL 17")]

    Browser -->|"REST API 요청<br/>(JSON, JWT)"| Backend
    Backend -->|응답| Browser
    Backend -->|"pg 쿼리"| DB
    DB -->|결과| Backend
```

## 2. 백엔드 내부 레이어 구성도

라우터 → 컨트롤러 겸 서비스 → DB 쿼리로 이어지는 3레이어이며, 미들웨어(cors/auth/errorHandler)를 공통으로 거친다. user/promotion/application 세 도메인이 동일한 구조로 나란히 존재한다.

```mermaid
flowchart TB
    Req["요청"] --> Cors["cors 미들웨어"]
    Cors --> Auth["auth 미들웨어<br/>(JWT 검증)"]

    subgraph Domains["도메인별 라우터(=컨트롤러 겸 서비스) → DB 쿼리"]
        UR["userRoutes"] --> UQ["userQueries"]
        PR["promotionRoutes"] --> PQ["promotionQueries"]
        AR["applicationRoutes"] --> AQ["applicationQueries"]
    end

    Auth --> UR
    Auth --> PR
    Auth --> AR

    UQ --> DB[("PostgreSQL")]
    PQ --> DB
    AQ --> DB

    UR -.에러.-> ErrorHandler["errorHandler 미들웨어"]
    PR -.에러.-> ErrorHandler
    AR -.에러.-> ErrorHandler
    ErrorHandler --> Res["응답"]
    DB --> Res
```

## 3. 인증 흐름도

로그인 시 access/refresh token을 함께 발급하고, 이후 요청은 access token으로 검증하며, 만료 시 refresh token으로 access token만 재발급받는 흐름이다.

```mermaid
sequenceDiagram
    actor 클라이언트
    participant 백엔드
    participant DB as PostgreSQL

    클라이언트->>백엔드: 로그인 요청(이메일/비밀번호)
    백엔드->>DB: 사용자 조회 및 비밀번호 검증
    DB-->>백엔드: 사용자 정보
    백엔드-->>클라이언트: access token + refresh token 발급

    클라이언트->>백엔드: API 요청 (Authorization: access token)
    백엔드->>백엔드: access token 검증(auth 미들웨어)
    백엔드-->>클라이언트: 정상 응답

    클라이언트->>백엔드: API 요청 (access token 만료)
    백엔드-->>클라이언트: 401 Unauthorized
    클라이언트->>백엔드: refresh token으로 재발급 요청
    백엔드->>백엔드: refresh token 검증(무상태, 서명만 확인)
    백엔드-->>클라이언트: 새 access token 발급
```

## 4. 프론트엔드 컴포넌트 구조도

`doc/5-project-principle.md`의 디렉토리 구조 기준으로, 페이지가 공통 컴포넌트를 조합하고 api 훅(TanStack Query)과 store(Zustand)를 사용하는 구조다.

```mermaid
flowchart TB
    App["App.jsx<br/>(라우팅)"] --> Header["Header<br/>(공통 컴포넌트)"]

    App --> LoginPage
    App --> SignupPage
    App --> PromotionListPage
    App --> PromotionDetailPage
    App --> PromotionFormPage
    App --> ApplicationStatusPage

    PromotionListPage --> PromotionCard["PromotionCard<br/>(공통 컴포넌트)"]

    LoginPage --> AuthApi["authApi<br/>(TanStack Query)"]
    SignupPage --> AuthApi
    AuthApi --> AuthStore["authStore<br/>(Zustand)"]

    PromotionListPage --> PromotionApi["promotionApi<br/>(TanStack Query)"]
    PromotionDetailPage --> PromotionApi
    PromotionFormPage --> PromotionApi

    PromotionDetailPage --> ApplicationApi["applicationApi<br/>(TanStack Query)"]
    ApplicationStatusPage --> ApplicationApi

    AuthStore -.로그인 사용자 정보.-> Header
```
