CREATE TABLE dayflow_transaction (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    description VARCHAR(120) NOT NULL,
    category VARCHAR(60) NOT NULL,
    amount DECIMAL(13, 2) NOT NULL,
    transaction_type VARCHAR(10) NOT NULL,
    occurred_on DATE NOT NULL DEFAULT (CURRENT_DATE),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_dayflow_transaction_user FOREIGN KEY (user_id) REFERENCES dayflow_user (id) ON DELETE CASCADE,
    CONSTRAINT chk_dayflow_transaction_amount CHECK (amount > 0),
    CONSTRAINT chk_dayflow_transaction_type CHECK (transaction_type IN ('income', 'expense')),
    INDEX ix_dayflow_transaction_user_date (user_id, occurred_on, id)
);

CREATE TABLE dayflow_task (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    title VARCHAR(120) NOT NULL,
    category VARCHAR(40) NOT NULL DEFAULT 'Personal',
    due_label VARCHAR(80) NOT NULL DEFAULT 'Today',
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_dayflow_task_user FOREIGN KEY (user_id) REFERENCES dayflow_user (id) ON DELETE CASCADE,
    INDEX ix_dayflow_task_user_status (user_id, completed, id)
);
