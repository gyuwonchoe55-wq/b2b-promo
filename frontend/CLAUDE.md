# b2b-promotion 프론트엔드앱 개발을 위한 지침

## 기술 스택

- React 19
- 전역 상태: Zustand (로그인 사용자 정보 등 최소한의 전역 상태에만 사용)
- 서버 상태/통신: TanStack Query (서버 데이터 캐싱/갱신은 TanStack Query에 위임)

## 문서 참조 (../docs/)

- `../docs/2-PRD.md` — PRD (요구사항/우선순위)
- `../docs/4-user-scenario.md` — 화면별 정상/예외 흐름 (화면 구현 참고용)
- `../docs/7-wireframe.md`, `../docs/promotion-list-wireframe.svg` — 화면 와이어프레임
- `../docs/10-style.md` — 스타일 가이드 (색상/폰트/카드 UI 컨셉)
- `../docs/login-page-hifi.png` — 로그인 화면 하이파이 참고 이미지
- `../docs/5-project-principle.md` — 프로젝트 구조 설계 원칙
- `../docs/swagger.json` — 백엔드 API 명세 (OpenAPI 3.0.3)
