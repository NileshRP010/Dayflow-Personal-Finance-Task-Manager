package com.dayflow.api.subscription;

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
@RequestMapping("/api/subscriptions")
public class SubscriptionController {
    private final SubscriptionRepository subscriptions;

    public SubscriptionController(SubscriptionRepository subscriptions) {
        this.subscriptions = subscriptions;
    }

    @GetMapping
    public List<Subscription> list(@AuthenticationPrincipal UserPrincipal user) {
        return subscriptions.findAll(user.id());
    }

    @PostMapping
    public Subscription create(
            @AuthenticationPrincipal UserPrincipal user,
            @Valid @RequestBody SubscriptionRequest request
    ) {
        return subscriptions.create(user.id(), request);
    }

    @PutMapping("/{id}")
    public Subscription update(
            @AuthenticationPrincipal UserPrincipal user,
            @PathVariable long id,
            @Valid @RequestBody SubscriptionRequest request
    ) {
        return subscriptions.update(user.id(), id, request);
    }

    @PatchMapping("/{id}/paid")
    public Subscription markPaid(@AuthenticationPrincipal UserPrincipal user, @PathVariable long id) {
        return subscriptions.markPaid(user.id(), id);
    }

    @DeleteMapping("/{id}")
    public void delete(@AuthenticationPrincipal UserPrincipal user, @PathVariable long id) {
        subscriptions.delete(user.id(), id);
    }

    public record SubscriptionRequest(
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Size(max = 60) String category,
            @NotNull @DecimalMin("0.01") BigDecimal amount,
            @NotBlank @Pattern(regexp = "weekly|monthly|yearly") String billingCycle,
            @NotNull LocalDate nextDueDate
    ) { }

    public record Subscription(
            long id,
            String name,
            String category,
            BigDecimal amount,
            String billingCycle,
            LocalDate nextDueDate,
            LocalDate lastPaidOn,
            boolean active
    ) { }
}
