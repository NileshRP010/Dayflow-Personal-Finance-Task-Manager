CREATE TABLE dayflow_subscription (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    name VARCHAR(120) NOT NULL,
    category VARCHAR(60) NOT NULL DEFAULT 'Subscriptions',
    amount DECIMAL(13, 2) NOT NULL,
    billing_cycle VARCHAR(10) NOT NULL,
    next_due_date DATE NOT NULL,
    last_paid_on DATE NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_dayflow_subscription_user FOREIGN KEY (user_id) REFERENCES dayflow_user (id) ON DELETE CASCADE,
    CONSTRAINT chk_dayflow_subscription_amount CHECK (amount > 0),
    CONSTRAINT chk_dayflow_subscription_cycle CHECK (billing_cycle IN ('weekly', 'monthly', 'yearly')),
    INDEX ix_dayflow_subscription_due (user_id, active, next_due_date)
);
