package com.dayflow.api.account;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepository {
    private final JdbcTemplate jdbc;

    public UserRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<UserPrincipal> findByEmail(String email) {
        return jdbc.query("""
                SELECT id, full_name, email, password_hash, default_currency, time_zone
                FROM dayflow_user WHERE email = ?
                """, (rs, row) -> new UserPrincipal(
                rs.getLong("id"),
                rs.getString("full_name"),
                rs.getString("email"),
                rs.getString("password_hash"),
                rs.getString("default_currency"),
                rs.getString("time_zone")
        ), email).stream().findFirst();
    }

    public UserAccount create(String fullName, String email, String passwordHash, String currency, String timeZone) {
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    INSERT INTO dayflow_user (full_name, email, password_hash, default_currency, time_zone)
                    VALUES (?, ?, ?, ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
            statement.setString(1, fullName);
            statement.setString(2, email);
            statement.setString(3, passwordHash);
            statement.setString(4, currency);
            statement.setString(5, timeZone);
            return statement;
        }, keys);
        Number id = keys.getKey();
        if (id == null) {
            throw new IllegalStateException("Database did not return a user id");
        }
        return new UserAccount(id.longValue(), fullName, email, currency, timeZone);
    }
}
