-- 단체급식 프로모션 신청 서비스 DDL
-- 참고: doc/8-erd.md

CREATE TABLE user (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20) NOT NULL CHECK (role IN ('MANAGER', 'PARTICIPANT'))
);

CREATE TABLE promotion (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    manager_id     INT NOT NULL,
    title          VARCHAR(255) NOT NULL,
    description    TEXT,
    apply_start_at DATE NOT NULL,
    apply_end_at   DATE NOT NULL,
    event_date     DATE NOT NULL,
    capacity       INT NOT NULL,
    CONSTRAINT fk_promotion_manager
        FOREIGN KEY (manager_id) REFERENCES user (id),
    CONSTRAINT chk_promotion_dates
        CHECK (apply_end_at >= apply_start_at AND event_date >= apply_end_at)
);

CREATE TABLE application (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    promotion_id  INT NOT NULL,
    user_id       INT NOT NULL,
    applied_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_application_promotion
        FOREIGN KEY (promotion_id) REFERENCES promotion (id) ON DELETE CASCADE,
    CONSTRAINT fk_application_user
        FOREIGN KEY (user_id) REFERENCES user (id),
    CONSTRAINT uq_application_promotion_user
        UNIQUE (promotion_id, user_id)
);
