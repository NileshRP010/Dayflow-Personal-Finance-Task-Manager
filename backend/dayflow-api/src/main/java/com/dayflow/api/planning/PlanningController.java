package com.dayflow.api.planning;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import com.dayflow.api.account.UserPrincipal;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class PlanningController {
    private final PlanningRepository planning;

    public PlanningController(PlanningRepository planning) {
        this.planning = planning;
    }

    @GetMapping("/budgets")
    public List<Budget> budgets(@AuthenticationPrincipal UserPrincipal user) {
        return planning.findBudgets(user.id());
    }

    @PostMapping("/budgets")
    public Budget createBudget(
            @AuthenticationPrincipal UserPrincipal user,
            @Valid @RequestBody BudgetRequest request
    ) {
        return planning.createBudget(user.id(), request);
    }

    @PutMapping("/budgets/{id}")
    public Budget updateBudget(
            @AuthenticationPrincipal UserPrincipal user,
            @PathVariable long id,
            @Valid @RequestBody BudgetRequest request
    ) {
        return planning.updateBudget(user.id(), id, request);
    }

    @DeleteMapping("/budgets/{id}")
    public void deleteBudget(@AuthenticationPrincipal UserPrincipal user, @PathVariable long id) {
        planning.deleteBudget(user.id(), id);
    }

    @GetMapping("/goals")
    public List<Goal> goals(@AuthenticationPrincipal UserPrincipal user) {
        return planning.findGoals(user.id());
    }

    @PostMapping("/goals")
    public Goal createGoal(
            @AuthenticationPrincipal UserPrincipal user,
            @Valid @RequestBody GoalRequest request
    ) {
        return planning.createGoal(user.id(), request);
    }

    @PutMapping("/goals/{id}")
    public Goal updateGoal(
            @AuthenticationPrincipal UserPrincipal user,
            @PathVariable long id,
            @Valid @RequestBody GoalRequest request
    ) {
        return planning.updateGoal(user.id(), id, request);
    }

    @DeleteMapping("/goals/{id}")
    public void deleteGoal(@AuthenticationPrincipal UserPrincipal user, @PathVariable long id) {
        planning.deleteGoal(user.id(), id);
    }

    public record BudgetRequest(
            @NotBlank @Size(max = 60) String category,
            @NotNull @DecimalMin("0.01") BigDecimal limit,
            @NotNull LocalDate monthStart
    ) { }

    public record Budget(long id, String category, LocalDate monthStart, BigDecimal limit, BigDecimal spent) { }

    public record GoalRequest(
            @NotBlank @Size(max = 100) String title,
            @NotBlank @Size(max = 16) String emoji,
            @NotNull @DecimalMin("0.00") BigDecimal savedAmount,
            @NotNull @DecimalMin("0.01") BigDecimal targetAmount,
            LocalDate targetDate
    ) { }

    public record Goal(long id, String title, String emoji, BigDecimal savedAmount, BigDecimal targetAmount, LocalDate targetDate) { }
}
