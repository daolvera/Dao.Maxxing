# Dao.Maxxing agent instructions

A personal nutrition tracker. It's an Aspire app with an ASP.NET Core API that
also serves the Angular frontend. Frontend rules are in
[Dao.Maxxing.Web/AGENTS.md](Dao.Maxxing.Web/AGENTS.md). This file covers the
repository and the backend.

## Backend structure

Dependencies point inward: Api → Services → Core. Never add a reference the
other way.

| Project | Holds | Must not hold |
|---|---|---|
| `Dao.Maxxing.Core` | Domain records and enums, and interfaces such as `IWeatherForecastService` and `IFoodProvider` | Package or ASP.NET references, implementations, or I/O |
| `Dao.Maxxing.Services` | Implementations of Core interfaces, their options classes, and `AddMaxxingServices()` | ASP.NET types (`HttpContext`, `IResult`) or endpoint code |
| `Dao.Maxxing.Api` | Hosting, auth, and endpoint mapping in `Endpoints/*Endpoints.cs`, plus error handling | Business logic. Endpoints only translate HTTP to a Core interface call and back |
| `Dao.Maxxing.ServiceDefaults` | Aspire defaults: OpenTelemetry, health checks, resilience | App-specific code |
| `tests/*` | `Services.Tests` for unit tests, `Api.Tests` for in-process integration tests | |

Organize by feature folders, such as `Weather/` and later `Foods/`, inside each
project. Don't use technical folders like `Models/` or `Interfaces/`.

## Dependency injection

- Every service is an interface in Core with an `internal sealed`
  implementation in Services. Register it in
  `Services/ServiceCollectionExtensions.cs` via `AddMaxxingServices`. Endpoints
  and other services depend on the interface only.
- Use primary-constructor injection. Never use `new` on a service, resolve one
  from `IServiceProvider` (no service locator), or use static mutable state.
- Lifetimes:
  - `Scoped` is the default for anything request-shaped.
  - `Singleton` is only for stateless, thread-safe types.
  - Typed `HttpClient`s go through `AddHttpClient<TClient>()`. Aspire's
    resilience handler applies automatically.
- Time comes from the injected `TimeProvider`, never `DateTime.Now` or
  `DateTimeOffset.UtcNow`, so tests can fix the clock.
- Chains of providers, such as the food sources from
  [docs/food-providers.md](docs/food-providers.md), work like this:
  - Register each provider as its own implementation.
  - Compose them in an orchestrating service that takes
    `IEnumerable<IFoodProvider>` or an explicit ordered list.

## Configuration: always `IOptions`

- Never read `IConfiguration["..."]` in application code. Each settings group
  gets a `sealed class XOptions`:
  - It has a `public const string SectionName` and defaults where sensible.
  - It lives next to the feature that uses it.
- Register options so they are validated at startup:

  ```csharp
  services.AddOptions<XOptions>()
      .Bind(configuration.GetSection(XOptions.SectionName))
      .ValidateDataAnnotations()   // [Required], [Range], [Url], ...
      .ValidateOnStart();
  ```

  For rules that DataAnnotations can't express, such as cross-field checks or
  nested objects, add an `IValidateOptions<XOptions>` class. Make its failure
  messages say which key to set and where. See `AuthenticationSettingsValidator`.
- Consume options as `IOptions<T>`. Use `IOptionsMonitor<T>` only if a value
  must change without a restart. Framework options get configured from yours
  via `AddOptions<TFramework>().Configure<IOptions<XOptions>>(...)`, never by
  reading configuration at registration time.
- Secrets, such as API keys and client secrets, go in user secrets locally and
  in deployment secrets in Azure. Never put them in `appsettings*.json`.
  Non-secret defaults go in `appsettings.json`, and development-only defaults go
  in `appsettings.Development.json`.

## Errors

- Every error response is ProblemDetails, defined in RFC 9457 (`application/problem+json`).
  - `AddApiProblemDetails` and `UseApiProblemDetails` cover unhandled
    exceptions and empty 4xx/5xx responses, and add a `traceId`.
  - For expected failures, return `TypedResults.Problem(...)` or
    `TypedResults.ValidationProblem(...)`. Never return an ad-hoc
    `{ error: ... }` body.
- Endpoints return `TypedResults`, and return `Results<T1, T2>` when there are
  multiple outcomes.
- Don't catch exceptions just to log them. Let the exception handler log them
  and return a 500 without internal details.

## Logging

- Use `[LoggerMessage]` source-generated methods on a `partial` class, with
  structured placeholders such as `{FoodId}`. Never interpolate strings into
  log messages.
- Never log secrets, tokens, or personal nutrition or body data beyond IDs.
- Console output is JSON in production and plain text in Development. Aspire
  collects OpenTelemetry logs, traces, and metrics.

## Endpoints

- Add one static class per feature: `Endpoints/XEndpoints.cs` with a
  `MapXEndpoints(this IEndpointRouteBuilder app)` method. It uses
  `MapGroup("/api/x")`, `.RequireAuthorization("api")`, and `.WithTags("X")`.
  Call it from `Program.cs`.
- Every `/api` endpoint requires the `api` policy unless it is deliberately
  public, in which case use `.AllowAnonymous()` and say why.
- Give every endpoint `.WithName(...)`. The OpenAPI operation IDs feed the
  generated Angular client.

## OpenAPI and the generated client

- Every build of `Dao.Maxxing.Api` writes `openapi/dao-maxxing-api.json`
  (`Microsoft.Extensions.ApiDescription.Server`). The Angular client in
  `Dao.Maxxing.Web/src/app/api/` is generated from it with `npm run
  generate:api` (`ng-openapi-gen.json`). Both are committed. Never edit them by
  hand.
- After any API contract change, build, run `npm run generate:api` in
  `Dao.Maxxing.Web`, and commit both. CI fails if either generator fails or its
  output differs from the PR.
- The build-time generator starts the app without secrets. `OpenApiSetup`
  supplies placeholder settings only inside that generator, so add any new
  required setting there too.
- Endpoints that the generated client shouldn't call, such as the auth
  redirects, use `.ExcludeFromDescription()`.

## Testing

- **Unit tests:** `tests/Dao.Maxxing.Services.Tests` tests services directly,
  using `InternalsVisibleTo`, `Options.Create(...)`, a fixed `TimeProvider`,
  and `NullLogger`. Also check that bad configuration fails options validation.
- **Integration tests:** `tests/Dao.Maxxing.Api.Tests` uses `ApiFactory`,
  which wraps `WebApplicationFactory` in the `Testing` environment.
  - Use `CreateSignedInClient()` for authenticated calls.
  - Swap services through `ConfigureServices`.
  - Assert status codes and ProblemDetails shape.
- Every new endpoint needs a signed-out 401 test and a happy-path test. Every
  new options class needs a validation test.
- Before pushing, run:

  ```bash
  dotnet build Dao.Maxxing.slnx -c Release && dotnet test Dao.Maxxing.slnx -c Release --no-build
  ```

## Build enforcement

These rules are enforced by the build and tests, not just by this file:

- **Warnings as errors.** `Directory.Build.props` sets `TreatWarningsAsErrors`
  for every project. Fix the warning. Don't add `NoWarn` or `#pragma warning
  disable` unless there is a justification comment. NuGet vulnerability
  advisories (NU1901–NU1904) stay warnings so a new advisory doesn't break
  unrelated builds. Upgrade the package instead of ignoring them.
- **Banned APIs (RS0030).** [BannedSymbols.txt](BannedSymbols.txt) is checked
  by `Microsoft.CodeAnalysis.BannedApiAnalyzers` in Api, Services, Core, and
  tests. It bans:
  - `DateTime.Now`, `DateTime.UtcNow`, `DateTime.Today`, `DateTimeOffset.Now`,
    and `DateTimeOffset.UtcNow`. Use `TimeProvider` instead.
  - `ConfigurationBinder.GetValue` and `Environment.GetEnvironmentVariable`.
    Use `IOptions` instead.
  - `Console`. Use `ILogger` instead.

  When you add a convention that can be expressed as a symbol, add it there
  with a message pointing to this file.
- **Convention tests.** `tests/Dao.Maxxing.Api.Tests/ConventionTests.cs`
  covers rules the analyzer can't see. For example, the analyzer misses indexer
  access, so `configuration["Key"]` is caught there.
- **Infrastructure exemption.** AppHost and ServiceDefaults are exempt from the
  banned list because they are Aspire infrastructure.

## Workflow

- Work comes from the GitHub project "Dao.Maxxing Roadmap", taken in its
  `order` field. Each issue goes on a branch, then a PR that `Closes #N`, and
  is squash-merged.
- CI (`.github/workflows/ci.yml`) runs the web build and tests, the .NET build
  and tests, and a container health check. All must pass.
- `global.json` pins the .NET 10 SDK, matching CI, even when newer previews
  are installed.
