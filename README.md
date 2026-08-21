# 단체급식 프로모션 신청 서비스

영양사(MANAGER)가 프로모션을 등록하고 취식자(PARTICIPANT)가 조회/신청하는 B2B 프로모션 신청 서비스.

## 문서

| 문서 | 설명 |
| --- | --- |
| [도메인 정의서](docs/1-domain-definition.md) | 문제 정의, 용어, 비즈니스 규칙 |
| [PRD](docs/2-PRD.md) | 개발 착수용 실행 문서 (요구사항/우선순위) |
| [주요 사용자 시나리오 다이어그램](docs/3-scenario-diagram.md) | mermaid 시퀀스 다이어그램 |
| [사용자 시나리오](docs/4-user-scenario.md) | 화면/API 구현 참고용 정상 흐름 + 예외 흐름 |
| [프로젝트 구조 설계 원칙](docs/5-project-principle.md) | 아키텍처/컨벤션 가이드 |
| [기술 아키텍처 다이어그램](docs/6-arch-diagram.md) | 시스템 구성도 |
| [화면 와이어프레임](docs/7-wireframe.md) | 화면별 저해상도 텍스트 와이어프레임 |
| [ERD](docs/8-erd.md) | users/promotions/applications 테이블 관계 |
| [DB 스키마 (DDL)](docs/8-schema.sql) | ERD를 반영한 실제 PostgreSQL 스키마 |
| [실행 계획](docs/9-plan.md) | 3일 일정, task별 완료 조건 체크리스트 |
| [스타일 가이드](docs/10-style.md) | 색상/폰트/컴포넌트 스타일 |
| [API 명세 (Swagger)](docs/swagger.json) | OpenAPI 3.0.3, 배포 서버의 `/api-docs`에서도 확인 가능 |

## Demo Site

- 프론트엔드: https://b2bpro-121-fe.vercel.app
- 백엔드: https://b2bpro-121-be.vercel.app

## 테스트용 사용자 계정

| 역할 | 이메일 | 비밀번호 |
| --- | --- | --- |
| 영양사 (MANAGER) | `manager@test.com` | `password123` |
| 취식자 (PARTICIPANT) | `participant@test.com` | `password123` |

## 간략한 테스트 시나리오

1. `manager@test.com`으로 로그인 → "프로모션 등록"에서 제목/내용/신청기간/진행일/모집인원을 입력해 프로모션을 등록한다.
2. 로그아웃 후 `participant@test.com`으로 로그인 → 목록에서 등록한 프로모션을 선택해 상세를 확인하고 "신청하기"를 누른다.
3. 신청 완료 상태와 모집 인원(1/N)이 반영되는지 확인하고, 페이지를 새로고침해도 신청 상태가 유지되는지 확인한다.
4. "신청 취소"로 신청을 취소하고 모집 인원이 복원되는지 확인한다.
5. 다시 `manager@test.com`으로 로그인 → 등록한 프로모션의 "신청 현황"에서 신청자 목록을 확인한다.

상세 정상/예외 흐름은 [사용자 시나리오](docs/4-user-scenario.md) 문서를 참고한다.
