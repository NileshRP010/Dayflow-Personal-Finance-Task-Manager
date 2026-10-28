CREATE TABLE dayflow_user (
    id BIGINT NOT NULL AUTO_INCREMENT,
    full_name VARCHAR(80) NOT NULL,
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    default_currency CHAR(3) NOT NULL DEFAULT 'INR',
    time_zone VARCHAR(80) NOT NULL DEFAULT 'Asia/Kolkata',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uq_dayflow_user_email UNIQUE (email)
);
