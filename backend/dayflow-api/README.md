# Dayflow API

Spring Boot API and session-based authentication for the Dayflow UI. The financial screens still use clearly labeled local preview data in this phase.

## Requirements

- JDK 17 or newer
- MySQL 8
- The included Maven wrapper downloads and runs the project’s pinned Maven distribution

The generated backend uses Spring Boot 4.1.1 and Java 17. This project was scaffolded from Spring Initializr; the system Java 8 installation is not sufficient to run it.

## Local database

Create a database and a dedicated local development account in MySQL. Choose a private password yourself; do not commit it.

```sql
CREATE DATABASE dayflow CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'dayflow'@'localhost' IDENTIFIED BY 'choose-a-local-password';
GRANT ALL PRIVILEGES ON dayflow.* TO 'dayflow'@'localhost';
```

Flyway creates the application tables on startup. Spring Session JDBC creates its session tables in the same database.

## Run locally on Windows PowerShell

From this directory, start the API with the helper. It asks for the database password as hidden input and keeps it out of the project files:

```powershell
.\run-local.ps1
```

Or set the environment manually in the current PowerShell window, then run the API:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-17'
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
$env:DB_USER = 'dayflow'
$env:DB_PASSWORD = 'your-local-password'
$env:DB_URL = 'jdbc:mysql://localhost:3306/dayflow?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC'
.\mvnw.cmd spring-boot:run
```

The Vite dev server proxies `/api` requests to `http://localhost:8080`.

## API endpoints

- `GET /api/health` — service health
- `GET /api/auth/csrf` — obtain a CSRF token for state-changing requests
- `POST /api/auth/signup` — create an account and start a session
- `POST /api/auth/login` — authenticate and start a session
- `GET /api/auth/me` — return the signed-in account
- `POST /api/auth/logout` — invalidate the session
- `GET /api/transactions` — list the signed-in user's transactions
- `POST /api/transactions` — save a transaction
- `PUT /api/transactions/{id}` and `DELETE /api/transactions/{id}` — update or remove a transaction
- `GET /api/tasks` — list the signed-in user's tasks
- `POST /api/tasks` — save a task
- `PUT /api/tasks/{id}`, `PATCH /api/tasks/{id}/completion`, and `DELETE /api/tasks/{id}` — update, complete, or remove a task
- `GET /api/budgets` and `POST /api/budgets` — list or create monthly category budgets with spending calculated from transactions
- `PUT /api/budgets/{id}` and `DELETE /api/budgets/{id}` — update or remove a budget
- `GET /api/goals` and `POST /api/goals` — list or create savings goals
- `PUT /api/goals/{id}` and `DELETE /api/goals/{id}` — update or remove a savings goal
- `GET /api/subscriptions` and `POST /api/subscriptions` — list or create recurring bills
- `PUT /api/subscriptions/{id}`, `PATCH /api/subscriptions/{id}/paid`, and `DELETE /api/subscriptions/{id}` — update, record payment, or remove a recurring bill

Passwords are BCrypt-hashed. Authentication uses an HttpOnly session cookie, CSRF protection, and server-side JDBC sessions. In production, set `SESSION_COOKIE_SECURE=true`, configure `SESSION_COOKIE_SAME_SITE`, and set `APP_CORS_ALLOWED_ORIGINS` to the exact trusted frontend origin or comma-separated trusted origins.

The Flyway migrations add transaction, task, budget, savings-goal, and recurring-bill tables. Recording a recurring payment advances its due date and adds an expense transaction in the same database transaction. Every personal-data query is scoped to the signed-in account ID; clients cannot choose another account's owner ID.
