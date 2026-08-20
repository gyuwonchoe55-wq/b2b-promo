# 스타일 가이드

> 참고 이미지: `[업무] 2026/클로드 강의/스타일/image01.jpg`, `image02.jpg` (보딩패스/항공권 카드 UI). 프로모션 카드를 "신청권(티켓)"처럼 보여주는 컨셉으로 차용한다. 오버엔지니어링 금지 원칙에 따라 디자인 시스템·CSS 프레임워크를 새로 들이지 않고, 기존 인라인 style 방식 위에 색상/폰트/모서리 값만 통일한다.

---

## 1. 참고 이미지에서 뽑은 공통 패턴

- **카드/티켓 메타포**: 큰 border-radius의 흰색 카드, 진한 배경 위에 떠 있는 레이아웃.
- **강한 포인트 컬러 1개**: 옐로우(image01) 또는 오렌지(image02) — 배경 전체 또는 헤더 바에만 과감하게 사용하고 나머지는 화이트/뉴트럴.
- **볼드 타이포 + 대문자 라벨**: 핵심 정보(도시 코드, 이름)는 굵고 크게, 보조 라벨("PASSENGER", "DEPARTURE")은 작은 대문자 + 회색.
- **알약형(pill) 버튼**: 완전히 둥근 버튼, 배경색과 대비되는 단색 채움(흰 카드 위엔 검정 버튼, 색 카드 위엔 흰 버튼).
- **점선 구분선**: 섹션 사이를 얇은 점선으로 구분.
- **미니멀 라인 일러스트**: 장식 아이콘은 단색 라인 드로잉 하나만.

---

## 2. 컬러

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-primary` | `#F5A623` (amber/mustard) | 포인트 컬러 — MANAGER 등록 버튼, 강조 배지, 활성 상태 |
| `--color-primary-dark` | `#D6890C` | 포인트 컬러 hover/active |
| `--color-ink` | `#22222E` | 본문 텍스트, 헤더 로고 |
| `--color-muted` | `#8C8C99` | 보조 라벨(대문자 캡션), placeholder |
| `--color-border` | `#E6E6EC` | 카드 테두리, 구분선 |
| `--color-surface` | `#FFFFFF` | 카드/배경 기본면 |
| `--color-bg` | `#F7F7FA` | 페이지 배경(카드가 떠 보이도록 살짝 톤 다운) |
| `--color-danger` | `#E0483E` | 오류 메시지, 마감 배지 |
| `--color-success` | `#2E9E5B` | 신청 완료 상태 |

> 원본 이미지의 오렌지(`#FF5A36`)·옐로우(`#F5A623`) 중 **amber(`#F5A623`)를 프로모션 primary로 채택**했다. 급식/식사 주제와 어울리고, danger 컬러(레드 계열)와 색상 대비가 명확해 오류 배지와 혼동될 일이 없다.

---

## 3. 타이포그래피

- 폰트 스택: `"Pretendard", "Apple SD Gothic Neo", -apple-system, sans-serif` (한글 지원 + 시스템 폴백, 웹폰트 추가 설치 없이 시스템에 있으면 사용, 없으면 자동으로 -apple-system/sans-serif로 대체 — 별도 @font-face/CDN 로딩 없음).
- 굵기: 제목/핵심 데이터 `font-weight: 700`, 본문 `400`, 보조 라벨 `600` + 대문자 + `letter-spacing: 0.04em`.
- 크기 스케일: 제목 `20px`, 부제/카드 타이틀 `16px`, 본문 `14px`, 보조 라벨 `11px`.

---

## 4. 형태 값 (Radius / Spacing / Shadow)

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--radius-card` | `16px` | 프로모션 카드, 폼 컨테이너 |
| `--radius-pill` | `999px` | 버튼 |
| `--space-unit` | `8px` | 여백 기본 단위(4/8/16/24 배수로 사용) |
| `--shadow-card` | `0 2px 8px rgba(0,0,0,0.06)` | 카드 그림자(연하게, 과하지 않게) |

---

## 5. 컴포넌트 적용 가이드

### 버튼 (pill)
```
border-radius: var(--radius-pill);
padding: 10px 24px;
font-weight: 700;
```
- Primary(등록/저장/신청): 배경 `--color-primary`, 텍스트 `#FFFFFF`.
- Secondary(취소/목록으로): 배경 투명, 테두리 `--color-border`, 텍스트 `--color-ink`.
- Danger(삭제): 배경 `--color-danger`, 텍스트 `#FFFFFF`.

### PromotionCard (`frontend/src/components/PromotionCard.jsx`)
- 카드: `background: var(--color-surface)`, `border-radius: var(--radius-card)`, `box-shadow: var(--shadow-card)`, `padding: 20px`.
- 제목: 16px / 700.
- 신청기간/모집인원 라인: 회색(`--color-muted`) 대문자 라벨 + 검정 값, 참고 이미지의 "PASSENGER / DEPARTURE" 라벨 스타일 차용.
- 마감 배지("정원 마감"): 작은 pill, 배경 `--color-danger`의 10% 투명도, 텍스트 `--color-danger`.
- 카드 사이 구분은 그림자만으로 충분(점선 구분선은 카드 내부 섹션 구분에만 사용).

### Header (`frontend/src/components/Header.jsx`)
- 배경 흰색, 하단 `1px solid var(--color-border)`.
- 로고: `--color-ink`, 700.
- 로그아웃 버튼: Secondary 버튼 스타일.

### 로그인/회원가입 폼 (`LoginPage.jsx`, `SignupPage.jsx`)
- 입력창: `border: 1px solid var(--color-border)`, `border-radius: 8px`, `padding: 10px 12px`.
- 포커스 시 테두리 `--color-primary`로 전환.
- 제출 버튼: Primary pill, 폭 100%.
- 에러 메시지: `--color-danger`, 12px, 입력창 바로 아래.

### 프로모션 등록/수정 폼 (`PromotionFormPage.jsx`)
- 폼 컨테이너: 카드 스타일(`--radius-card`, `--shadow-card`) 적용해 하나의 "티켓 작성지"처럼 보이게.
- 날짜 2개(신청 시작일/종료일)는 데스크톱에서 한 줄, 모바일에서 세로 스택(기존 wireframe 지침 유지).
- 저장(Primary) / 취소(Secondary) / 삭제(Danger) 버튼 순서 고정.

### 신청 완료 상태
- "신청 완료" 텍스트: `--color-success` + 굵게, 참고 이미지의 체크인/탑승 확정 뱃지 느낌을 배지(pill, 연한 초록 배경)로 표현.

---

## 6. 적용 범위와 남겨둘 것

- 이 문서는 **색상·폰트·형태 값과 컴포넌트별 적용 규칙**만 정의한다. 실제 CSS 반영은 각 컴포넌트 파일의 인라인 style을 이 토큰 값으로 맞추는 선에서 진행하고, 별도 테마 프로바이더·CSS 변수 시스템(styled-components, Tailwind 등)은 도입하지 않는다.
- 애니메이션, 다크모드, 접근성 세부 규정은 이번 스코프 밖이다(PRD상 반응형 레이아웃 점검(FE-8)만 범위 내).
