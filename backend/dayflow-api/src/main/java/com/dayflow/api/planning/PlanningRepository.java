package com.dayflow.api.planning;

import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.List;

import com.dayflow.api.planning.PlanningController.Budget;
import com.dayflow.api.planning.PlanningController.BudgetRequest;
import com.dayflow.api.planning.PlanningController.Goal;
import com.dayflow.api.planning.PlanningController.GoalRequest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;

@Repository
public class PlanningRepository {
    private final JdbcTemplate jdbc;

    public PlanningRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Budget> findBudgets(long userId) {
        return jdbc.query("""
                SELECT b.id, b.category, b.month_start, b.limit_amount,
                       COALESCE(SUM(t.amount), 0) AS spent
                FROM dayflow_budget b
                LEFT JOIN dayflow_transaction t ON t.user_id = b.user_id
                    AND t.category = b.category AND t.transaction_type = 'expense'
                    AND t.occurred_on >= b.month_start
                    AND t.occurred_on < DATE_ADD(b.month_start, INTERVAL 1 MONTH)
                WHERE b.user_id = ? AND b.month_start = DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')
                GROUP BY b.id, b.category, b.month_start, b.limit_amount
                ORDER BY b.month_start DESC, b.category ASC
                """, (rs, row) -> new Budget(rs.getLong("id"), rs.getString("category"),
                rs.getObject("month_start", LocalDate.class), rs.getBigDecimal("limit_amount"),
                rs.getBigDecimal("spent")), userId);
    }

    public Budget createBudget(long userId, BudgetRequest request) {
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    INSERT INTO dayflow_budget (user_id, category, month_start, limit_amount) VALUES (?, ?, ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, userId);
            statement.setString(2, request.category().trim());
            statement.setDate(3, Date.valueOf(request.monthStart().withDayOfMonth(1)));
            statement.setBigDecimal(4, request.limit());
            return statement;
        }, keys);
        return budget(keys.getKey().longValue(), userId);
    }

    public Budget updateBudget(long userId, long id, BudgetRequest request) {
        int changed = jdbc.update("""
                UPDATE dayflow_budget SET category = ?, month_start = ?, limit_amount = ? WHERE id = ? AND user_id = ?
                """, request.category().trim(), Date.valueOf(request.monthStart().withDayOfMonth(1)),
                request.limit(), id, userId);
        if (changed == 0) throw notFound();
        return budget(id, userId);
    }

    public void deleteBudget(long userId, long id) {
        if (jdbc.update("DELETE FROM dayflow_budget WHERE id = ? AND user_id = ?", id, userId) == 0) throw notFound();
    }

    public List<Goal> findGoals(long userId) {
        return jdbc.query("""
                SELECT id, title, emoji, saved_amount, target_amount, target_date
                FROM dayflow_goal WHERE user_id = ? ORDER BY id DESC
                """, (rs, row) -> new Goal(rs.getLong("id"), rs.getString("title"), rs.getString("emoji"),
                rs.getBigDecimal("saved_amount"), rs.getBigDecimal("target_amount"),
                rs.getDate("target_date") == null ? null : rs.getDate("target_date").toLocalDate()), userId);
    }

    public Goal createGoal(long userId, GoalRequest request) {
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    INSERT INTO dayflow_goal (user_id, title, emoji, saved_amount, target_amount, target_date)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, userId);
            statement.setString(2, request.title().trim());
            statement.setString(3, request.emoji());
            statement.setBigDecimal(4, request.savedAmount());
            statement.setBigDecimal(5, request.targetAmount());
            statement.setDate(6, request.targetDate() == null ? null : Date.valueOf(request.targetDate()));
            return statement;
        }, keys);
        return goal(keys.getKey().longValue(), userId);
    }

    public Goal updateGoal(long userId, long id, GoalRequest request) {
        int changed = jdbc.update("""
                UPDATE dayflow_goal SET title = ?, emoji = ?, saved_amount = ?, target_amount = ?, target_date = ?
                WHERE id = ? AND user_id = ?
                """, request.title().trim(), request.emoji(), request.savedAmount(), request.targetAmount(),
                request.targetDate() == null ? null : Date.valueOf(request.targetDate()), id, userId);
        if (changed == 0) throw notFound();
        return goal(id, userId);
    }

    public void deleteGoal(long userId, long id) {
        if (jdbc.update("DELETE FROM dayflow_goal WHERE id = ? AND user_id = ?", id, userId) == 0) throw notFound();
    }

    private Budget budget(long id, long userId) {
        return jdbc.query("""
                SELECT b.id, b.category, b.month_start, b.limit_amount, COALESCE(SUM(t.amount), 0) AS spent
                FROM dayflow_budget b LEFT JOIN dayflow_transaction t ON t.user_id = b.user_id
                    AND t.category = b.category AND t.transaction_type = 'expense'
                    AND t.occurred_on >= b.month_start AND t.occurred_on < DATE_ADD(b.month_start, INTERVAL 1 MONTH)
                WHERE b.id = ? AND b.user_id = ?
                GROUP BY b.id, b.category, b.month_start, b.limit_amount
                """, (rs, row) -> new Budget(rs.getLong("id"), rs.getString("category"),
                rs.getObject("month_start", LocalDate.class), rs.getBigDecimal("limit_amount"),
                rs.getBigDecimal("spent")), id, userId).stream().findFirst().orElseThrow(this::notFound);
    }

    private Goal goal(long id, long userId) {
        return jdbc.query("""
                SELECT id, title, emoji, saved_amount, target_amount, target_date
                FROM dayflow_goal WHERE id = ? AND user_id = ?
                """, (rs, row) -> new Goal(rs.getLong("id"), rs.getString("title"), rs.getString("emoji"),
                rs.getBigDecimal("saved_amount"), rs.getBigDecimal("target_amount"),
                rs.getDate("target_date") == null ? null : rs.getDate("target_date").toLocalDate()), id, userId)
                .stream().findFirst().orElseThrow(this::notFound);
    }

    private ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found");
    }
}
