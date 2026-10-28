package com.dayflow.api.subscription;

import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.List;

import com.dayflow.api.subscription.SubscriptionController.Subscription;
import com.dayflow.api.subscription.SubscriptionController.SubscriptionRequest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Repository
public class SubscriptionRepository {
    private final JdbcTemplate jdbc;

    public SubscriptionRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Subscription> findAll(long userId) {
        return jdbc.query("""
                SELECT id, name, category, amount, billing_cycle, next_due_date, last_paid_on, active
                FROM dayflow_subscription WHERE user_id = ? AND active = TRUE
                ORDER BY next_due_date ASC, id ASC
                """, this::map, userId);
    }

    public Subscription create(long userId, SubscriptionRequest request) {
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    INSERT INTO dayflow_subscription (user_id, name, category, amount, billing_cycle, next_due_date)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, userId);
            statement.setString(2, request.name().trim());
            statement.setString(3, request.category().trim());
            statement.setBigDecimal(4, request.amount());
            statement.setString(5, request.billingCycle());
            statement.setDate(6, Date.valueOf(request.nextDueDate()));
            return statement;
        }, keys);
        return findById(userId, keys.getKey().longValue());
    }

    public Subscription update(long userId, long id, SubscriptionRequest request) {
        int changed = jdbc.update("""
                UPDATE dayflow_subscription
                SET name = ?, category = ?, amount = ?, billing_cycle = ?, next_due_date = ?
                WHERE id = ? AND user_id = ? AND active = TRUE
                """, request.name().trim(), request.category().trim(), request.amount(), request.billingCycle(),
                Date.valueOf(request.nextDueDate()), id, userId);
        if (changed == 0) throw notFound();
        return findById(userId, id);
    }

    @Transactional
    public Subscription markPaid(long userId, long id) {
        Subscription current = findById(userId, id);
        LocalDate paidOn = LocalDate.now();
        LocalDate nextDue = advance(current.nextDueDate(), current.billingCycle(), paidOn);
        jdbc.update("""
                UPDATE dayflow_subscription SET next_due_date = ?, last_paid_on = ?
                WHERE id = ? AND user_id = ? AND active = TRUE
                """, Date.valueOf(nextDue), Date.valueOf(paidOn), id, userId);
        jdbc.update("""
                INSERT INTO dayflow_transaction (user_id, description, category, amount, transaction_type, occurred_on)
                VALUES (?, ?, ?, ?, 'expense', ?)
                """, userId, "Subscription: " + current.name(), current.category(), current.amount(), Date.valueOf(paidOn));
        return findById(userId, id);
    }

    public void delete(long userId, long id) {
        if (jdbc.update("UPDATE dayflow_subscription SET active = FALSE WHERE id = ? AND user_id = ? AND active = TRUE", id, userId) == 0) {
            throw notFound();
        }
    }

    private LocalDate advance(LocalDate due, String cycle, LocalDate paidOn) {
        LocalDate next = due;
        do {
            next = switch (cycle) {
                case "weekly" -> next.plusWeeks(1);
                case "yearly" -> next.plusYears(1);
                default -> next.plusMonths(1);
            };
        } while (!next.isAfter(paidOn));
        return next;
    }

    private Subscription findById(long userId, long id) {
        return jdbc.query("""
                SELECT id, name, category, amount, billing_cycle, next_due_date, last_paid_on, active
                FROM dayflow_subscription WHERE id = ? AND user_id = ? AND active = TRUE
                """, this::map, id, userId).stream().findFirst().orElseThrow(this::notFound);
    }

    private Subscription map(java.sql.ResultSet rs, int row) throws java.sql.SQLException {
        Date lastPaid = rs.getDate("last_paid_on");
        return new Subscription(rs.getLong("id"), rs.getString("name"), rs.getString("category"),
                rs.getBigDecimal("amount"), rs.getString("billing_cycle"),
                rs.getDate("next_due_date").toLocalDate(), lastPaid == null ? null : lastPaid.toLocalDate(),
                rs.getBoolean("active"));
    }

    private ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Subscription not found");
    }
}
