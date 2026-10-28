CREATE TABLE dayflow_budget (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    category VARCHAR(60) NOT NULL,
    month_start DATE NOT NULL,
    limit_amount DECIMAL(13, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_dayflow_budget_user FOREIGN KEY (user_id) REFERENCES dayflow_user (id) ON DELETE CASCADE,
    CONSTRAINT chk_dayflow_budget_amount CHECK (limit_amount > 0),
    CONSTRAINT uq_dayflow_budget_period UNIQUE (user_id, category, month_start),
    INDEX ix_dayflow_budget_user_month (user_id, month_start)
);

CREATE TABLE dayflow_goal (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    title VARCHAR(100) NOT NULL,
    emoji VARCHAR(16) NOT NULL DEFAULT '🌱',
    saved_amount DECIMAL(13, 2) NOT NULL DEFAULT 0,
    target_amount DECIMAL(13, 2) NOT NULL,
    target_date DATE NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_dayflow_goal_user FOREIGN KEY (user_id) REFERENCES dayflow_user (id) ON DELETE CASCADE,
    CONSTRAINT chk_dayflow_goal_amounts CHECK (saved_amount >= 0 AND target_amount > 0),
    INDEX ix_dayflow_goal_user (user_id, id)
);
