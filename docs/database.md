# Database (A1)

**Status:** Accepted.
**Decided:** 2026-10-31
**Choice:** SQL Server, with EF Core migrations. Locally a SQL Server
container run by Aspire; in Azure, Azure SQL Database serverless (D3 #12).

## Why SQL Server / Azure SQL

- **One engine everywhere.** The local container
  (`mcr.microsoft.com/mssql/server:2022-latest`), the integration tests, and
  Azure SQL run the same engine, so migrations and queries behave the same in
  each.
- **First-class in the stack.** EF Core's SQL Server provider and Aspire's
  `Aspire.Hosting.SqlServer` / `Aspire.Microsoft.EntityFrameworkCore.SqlServer`
  integrations are the best-supported path. D3 swaps the AppHost resource for
  `AddAzureSqlServer(...)` and keeps the `maxxing` connection name, so the API
  doesn't change.
- **Relational fits the data.** Foods, servings, meals, and daily logs are
  related records with reporting queries over dates.
- **Cost.** A single-user tracker is idle most of the day, which is what
  serverless is for (below).

## Cost and serverless notes

These shape D3 #12; nothing is provisioned in A1.

- Use the **General Purpose serverless** tier with **auto-pause**. A paused
  database bills only for storage. The first request after a pause waits for
  it to resume (up to about a minute), so the API's connection retries matter.
- Azure SQL's **free offer** gives one serverless database a monthly allowance
  of vCore-seconds and storage. Set it to auto-pause when the allowance runs
  out rather than bill, unless that's ever a problem.
- Keep the minimum vCores at the lowest setting. Scale up only if queries get
  slow.
- Check current limits and prices on the Azure pricing page when provisioning;
  they change.

## How it's wired

- **AppHost:** `AddSqlServer("sql")` with a persistent container and a data
  volume, so data survives AppHost restarts. Aspire generates the `sa`
  password and keeps it in the AppHost's user secrets. The `maxxing` database
  is passed to the API as `ConnectionStrings__maxxing`.
- **API:** `DatabaseOptions` (`Dao.Maxxing.Services/Data/`) reads
  `ConnectionStrings:maxxing` and fails startup validation without it.
  `MaxxingDbContext` is registered in `AddMaxxingServices`, and
  `AddApiDatabase` adds Aspire's retries, connectivity health check, and
  telemetry.
- **Migrations** live in `Dao.Maxxing.Services/Data/Migrations` and run **on
  startup in every environment** (`DatabaseMigrator`), before the server
  accepts requests. EF Core takes a database lock while migrating, so
  instances never apply the same migration twice. `Database:ApplyMigrationsOnStartup=false`
  turns it off, for example if D4 #13 moves migrations into a deployment step.
- **Health:** `/health` fails while the database is unreachable or any
  migration is unapplied.
- **Tests:** `tests/Dao.Maxxing.Api.Tests` start one SQL Server container per
  run with Testcontainers, locally and in CI. Docker must be running, with
  Engine 25 or later (API 1.44). On an older engine, update Docker Desktop, or
  set `DOCKER_API_VERSION=1.43` for test runs.
- The initial migration is an empty baseline. Domain tables start in F2.

## Running without the AppHost

Point the API at any SQL Server with user secrets:

```bash
dotnet user-secrets set "ConnectionStrings:maxxing" "<connection string>" --project Dao.Maxxing.Api
```
