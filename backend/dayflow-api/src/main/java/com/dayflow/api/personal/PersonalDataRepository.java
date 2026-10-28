package com.dayflow.api.personal;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.List;

import com.dayflow.api.personal.PersonalDataController.MoneyTransaction;
import com.dayflow.api.personal.PersonalDataController.PersonalTask;
import com.dayflow.api.personal.PersonalDataController.TaskRequest;
import com.dayflow.api.personal.PersonalDataController.TransactionRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Repository
public class PersonalDataRepository {
    private final JdbcTemplate jdbc;

    public PersonalDataRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<MoneyTransaction> findTransactions(long userId) {
        return jdbc.query("""
                SELECT id, description, category, amount, transaction_type, occurred_on
                FROM dayflow_transaction WHERE user_id = ? ORDER BY occurred_on DESC, id DESC
                """, (rs, row) -> new MoneyTransaction(rs.getLong("id"), rs.getString("description"),
                rs.getString("category"), rs.getBigDecimal("amount"), rs.getString("transaction_type"),
                rs.getObject("occurred_on", LocalDate.class)), userId);
    }

    public MoneyTransaction createTransaction(long userId, TransactionRequest request) {
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    INSERT INTO dayflow_transaction (user_id, description, category, amount, transaction_type, occurred_on)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, userId);
            statement.setString(2, request.description().trim());
            statement.setString(3, request.category().trim());
            statement.setBigDecimal(4, request.amount());
            statement.setString(5, request.kind());
            statement.setObject(6, request.date());
            return statement;
        }, keys);
        return transaction(keys.getKey().longValue(), userId);
    }

    public MoneyTransaction updateTransaction(long userId, long id, TransactionRequest request) {
        int changed = jdbc.update("""
                UPDATE dayflow_transaction SET description = ?, category = ?, amount = ?, transaction_type = ?, occurred_on = ?
                WHERE id = ? AND user_id = ?
                """, request.description().trim(), request.category().trim(), request.amount(), request.kind(),
                request.date(), id, userId);
        if (changed == 0) throw notFound();
        return transaction(id, userId);
    }

    public void deleteTransaction(long userId, long id) {
        if (jdbc.update("DELETE FROM dayflow_transaction WHERE id = ? AND user_id = ?", id, userId) == 0) {
            throw notFound();
        }
    }

    public List<PersonalTask> findTasks(long userId) {
        return jdbc.query("""
                SELECT id, title, category, due_label, completed FROM dayflow_task
                WHERE user_id = ? ORDER BY completed ASC, id DESC
                """, (rs, row) -> new PersonalTask(rs.getLong("id"), rs.getString("title"),
                rs.getString("category"), rs.getString("due_label"), rs.getBoolean("completed")), userId);
    }

    public PersonalTask createTask(long userId, TaskRequest request) {
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    INSERT INTO dayflow_task (user_id, title, category, due_label, completed) VALUES (?, ?, ?, ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, userId);
            statement.setString(2, request.title().trim());
            statement.setString(3, request.category().trim());
            statement.setString(4, request.due().trim());
            statement.setBoolean(5, request.done());
            return statement;
        }, keys);
        return task(keys.getKey().longValue(), userId);
    }

    public PersonalTask updateTask(long userId, long id, TaskRequest request) {
        int changed = jdbc.update("""
                UPDATE dayflow_task SET title = ?, category = ?, due_label = ?, completed = ?
                WHERE id = ? AND user_id = ?
                """, request.title().trim(), request.category().trim(), request.due().trim(), request.done(), id, userId);
        if (changed == 0) throw notFound();
        return task(id, userId);
    }

    public PersonalTask setTaskCompletion(long userId, long id, boolean completed) {
        int changed = jdbc.update("UPDATE dayflow_task SET completed = ? WHERE id = ? AND user_id = ?", completed, id, userId);
        if (changed == 0) throw notFound();
        return task(id, userId);
    }

    public void deleteTask(long userId, long id) {
        if (jdbc.update("DELETE FROM dayflow_task WHERE id = ? AND user_id = ?", id, userId) == 0) {
            throw notFound();
        }
    }

    private MoneyTransaction transaction(long id, long userId) {
        return jdbc.query("""
                SELECT id, description, category, amount, transaction_type, occurred_on
                FROM dayflow_transaction WHERE id = ? AND user_id = ?
                """, (rs, row) -> new MoneyTransaction(rs.getLong("id"), rs.getString("description"),
                rs.getString("category"), rs.getBigDecimal("amount"), rs.getString("transaction_type"),
                rs.getObject("occurred_on", LocalDate.class)), id, userId).stream().findFirst().orElseThrow(this::notFound);
    }

    private PersonalTask task(long id, long userId) {
        return jdbc.query("""
                SELECT id, title, category, due_label, completed FROM dayflow_task WHERE id = ? AND user_id = ?
                """, (rs, row) -> new PersonalTask(rs.getLong("id"), rs.getString("title"),
                rs.getString("category"), rs.getString("due_label"), rs.getBoolean("completed")), id, userId)
                .stream().findFirst().orElseThrow(this::notFound);
    }

    private ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found");
    }
}
