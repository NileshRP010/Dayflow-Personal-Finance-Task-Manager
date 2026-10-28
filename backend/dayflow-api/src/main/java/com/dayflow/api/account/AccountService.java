package com.dayflow.api.account;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AccountService {
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;

    public AccountService(UserRepository users, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    public UserAccount register(String fullName, String email, String password, String currency, String timeZone) {
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be 72 UTF-8 bytes or fewer");
        }
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        try {
            return users.create(fullName.trim(), normalizedEmail, passwordEncoder.encode(password), currency, timeZone);
        } catch (DuplicateKeyException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists");
        }
    }
}
