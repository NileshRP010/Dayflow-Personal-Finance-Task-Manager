package com.dayflow.api.auth;

import com.dayflow.api.account.AccountService;
import com.dayflow.api.account.UserAccount;
import com.dayflow.api.account.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AccountService accounts;
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository contextRepository;

    public AuthController(
            AccountService accounts,
            AuthenticationManager authenticationManager,
            SecurityContextRepository contextRepository
    ) {
        this.accounts = accounts;
        this.authenticationManager = authenticationManager;
        this.contextRepository = contextRepository;
    }

    @GetMapping("/csrf")
    public CsrfPayload csrf(CsrfToken token) {
        return new CsrfPayload(token.getToken(), token.getHeaderName());
    }

    @PostMapping("/signup")
    public UserAccount signUp(
            @Valid @RequestBody SignUpRequest body,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        UserAccount account = accounts.register(
                body.fullName(), body.email(), body.password(), body.defaultCurrency(), body.timeZone()
        );
        authenticate(body.email(), body.password(), request, response);
        return account;
    }

    @PostMapping("/login")
    public UserAccount signIn(
            @Valid @RequestBody SignInRequest body,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        UserPrincipal principal = (UserPrincipal) authenticate(body.email(), body.password(), request, response).getPrincipal();
        return principal.publicAccount();
    }

    @GetMapping("/me")
    public UserAccount currentUser(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in to continue");
        }
        return principal.publicAccount();
    }

    private Authentication authenticate(
            String email,
            String password,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(email.trim().toLowerCase(), password)
            );
        } catch (BadCredentialsException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email or password is incorrect");
        }
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        contextRepository.saveContext(context, request, response);
        return authentication;
    }

    public record CsrfPayload(String token, String headerName) { }

    public record SignUpRequest(
            @NotBlank @Size(min = 2, max = 80) String fullName,
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(min = 10, max = 72) String password,
            @NotBlank @Size(min = 3, max = 3) String defaultCurrency,
            @NotBlank @Size(max = 80) String timeZone
    ) { }

    public record SignInRequest(
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(min = 1, max = 72) String password
    ) { }
}
