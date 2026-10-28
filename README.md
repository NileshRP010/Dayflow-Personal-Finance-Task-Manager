# Dayflow — Personal Finance & Task Manager

Dayflow brings everyday money tracking and personal tasks into one calm dashboard. Record income and expenses, set monthly budgets, track savings goals and recurring bills, and keep personal tasks moving.

## Features

- Monthly income, expense, balance, and category spending summaries
- Transaction search, income/expense filters, pagination, editing, deletion, and CSV export
- Monthly budgets linked to recorded expenses
- Savings goals with contribution tracking
- Recurring bills with payment history
- Personal tasks with due dates, overdue status, categories, and completion tracking
- In-app reminders for due tasks, upcoming bills, and budgets nearing their limits
- Account sign-in with secure server-side sessions
- Sample preview mode for exploring the interface

## Technology

- React, Vite, Framer Motion, Recharts, and Lucide
- Spring Boot API, Java 17, Spring Security, and JDBC sessions
- MySQL 8 with Flyway database migrations

## Run locally

Start MySQL and create a `dayflow` database. From `backend/dayflow-api` in Windows PowerShell, run:

```powershell
.\run-local.ps1
```

Then, from the project root, install the frontend dependencies and start Vite:

```powershell
npm ci
npm run dev
```

The development server proxies `/api` requests to `http://localhost:8080`. Leave `VITE_API_BASE_URL` empty for local development.

## Deployment

Vercel hosts the Vite frontend. The Spring Boot API and MySQL database must run on a Java-compatible API host and a managed MySQL host. Configure `VITE_API_BASE_URL` on Vercel, then configure the API host with its database URL, credentials, allowed frontend origins, and production session-cookie settings.

See [DEPLOYMENT.md](DEPLOYMENT.md) for the deployment configuration and required environment variables. Keep production credentials in the hosting providers’ environment settings; do not commit them.
