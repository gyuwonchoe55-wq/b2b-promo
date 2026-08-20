-- 단체급식 프로모션 신청 서비스 DDL (PostgreSQL 17, PRD 8장 기준)
-- 참고: doc/8-erd.md

CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20) NOT NULL CHECK (role IN ('MANAGER', 'PARTICIPANT'))
);

CREATE TABLE promotions (
    id             SERIAL PRIMARY KEY,
    manager_id     INT NOT NULL REFERENCES users (id),
    title          VARCHAR(255) NOT NULL,
    description    TEXT,
    apply_start_at DATE NOT NULL,
    apply_end_at   DATE NOT NULL,
    event_date     DATE NOT NULL,
    capacity       INT NOT NULL,
    applied_count  INT NOT NULL DEFAULT 0,
    CONSTRAINT chk_promotion_dates
        CHECK (apply_end_at >= apply_start_at AND event_date >= apply_end_at),
    CONSTRAINT chk_promotion_applied_count
        CHECK (applied_count >= 0 AND applied_count <= capacity)
);

CREATE TABLE applications (
    id           SERIAL PRIMARY KEY,
    promotion_id INT NOT NULL REFERENCES promotions (id) ON DELETE CASCADE,
    user_id      INT NOT NULL REFERENCES users (id),
    applied_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_application_promotion_user
        UNIQUE (promotion_id, user_id)
);
