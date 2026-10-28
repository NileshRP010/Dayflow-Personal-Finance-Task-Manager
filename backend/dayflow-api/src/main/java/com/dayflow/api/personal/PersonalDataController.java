package com.dayflow.api.personal;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import com.dayflow.api.account.UserPrincipal;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class PersonalDataController {
    private final PersonalDataRepository data;

    public PersonalDataController(PersonalDataRepository data) {
        this.data = data;
    }

    @GetMapping("/transactions")
    public List<MoneyTransaction> transactions(@AuthenticationPrincipal UserPrincipal user) {
        return data.findTransactions(user.id());
    }

    @PostMapping("/transactions")
    public MoneyTransaction createTransaction(
            @AuthenticationPrincipal UserPrincipal user,
            @Valid @RequestBody TransactionRequest request
    ) {
        return data.createTransaction(user.id(), request);
    }

    @PutMapping("/transactions/{id}")
    public MoneyTransaction updateTransaction(
            @AuthenticationPrincipal UserPrincipal user,
            @PathVariable long id,
            @Valid @RequestBody TransactionRequest request
    ) {
        return data.updateTransaction(user.id(), id, request);
    }

    @DeleteMapping("/transactions/{id}")
    public void deleteTransaction(@AuthenticationPrincipal UserPrincipal user, @PathVariable long id) {
        data.deleteTransaction(user.id(), id);
    }

    @GetMapping("/tasks")
    public List<PersonalTask> tasks(@AuthenticationPrincipal UserPrincipal user) {
        return data.findTasks(user.id());
    }

    @PostMapping("/tasks")
    public PersonalTask createTask(
            @AuthenticationPrincipal UserPrincipal user,
            @Valid @RequestBody TaskRequest request
    ) {
        return data.createTask(user.id(), request);
    }

    @PutMapping("/tasks/{id}")
    public PersonalTask updateTask(
            @AuthenticationPrincipal UserPrincipal user,
            @PathVariable long id,
            @Valid @RequestBody TaskRequest request
    ) {
        return data.updateTask(user.id(), id, request);
    }

    @PatchMapping("/tasks/{id}/completion")
    public PersonalTask setTaskCompletion(
            @AuthenticationPrincipal UserPrincipal user,
            @PathVariable long id,
            @Valid @RequestBody CompletionRequest request
    ) {
        return data.setTaskCompletion(user.id(), id, request.completed());
    }

    @DeleteMapping("/tasks/{id}")
    public void deleteTask(@AuthenticationPrincipal UserPrincipal user, @PathVariable long id) {
        data.deleteTask(user.id(), id);
    }

    public record TransactionRequest(
            @NotBlank @Size(max = 120) String description,
            @NotBlank @Size(max = 60) String category,
            @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
            @NotBlank @Pattern(regexp = "income|expense") String kind,
            @NotNull LocalDate date
    ) { }

    public record MoneyTransaction(
            long id, String description, String category, BigDecimal amount, String kind, LocalDate date
    ) { }

    public record TaskRequest(
            @NotBlank @Size(max = 120) String title,
            @NotBlank @Size(max = 40) String category,
            @NotBlank @Size(max = 80) String due,
            boolean done
    ) { }

    public record PersonalTask(long id, String title, String category, String due, boolean done) { }

    public record CompletionRequest(@NotNull Boolean completed) { }
}
