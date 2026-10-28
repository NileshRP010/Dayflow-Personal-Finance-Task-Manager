package com.dayflow.api.account;

public record UserAccount(
        long id,
        String fullName,
        String email,
        String defaultCurrency,
        String timeZone
) {
}
