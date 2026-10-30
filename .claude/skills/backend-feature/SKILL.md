---
name: backend-feature
description: Add or change a backend feature in Dao.Maxxing (endpoint, service, provider, or configuration) following the Core/Services/Api layering with DI and validated IOptions. Use whenever touching Dao.Maxxing.Api, Dao.Maxxing.Services, or Dao.Maxxing.Core.
---

# Adding a backend feature

Follow the rules in `AGENTS.md`, sections "Backend structure" through
"Testing". Use the `Weather` feature as the reference slice; it touches every
step below. The examples use `Foods`; substitute the feature's name.

1. **Core contract.** In `Dao.Maxxing.Core/Foods/`, add the domain records and
   the interface (`IFoodSearchService`, `IFoodProvider`, ...). These are plain
   C# with no package references.
2. **Options**, if the feature has settings. In `Dao.Maxxing.Services/Foods/`,
   add `FoodsOptions`:
   - a `SectionName` constant
   - DataAnnotations attributes
   - an `IValidateOptions<FoodsOptions>` class for rules attributes can't
     express

   Put non-secret defaults in `Dao.Maxxing.Api/appsettings.json`. Secrets get
   documented as user-secrets commands and are never committed.
3. **Implementation.** In `Dao.Maxxing.Services/Foods/`, add an
   `internal sealed partial class` that implements the interface:
   - Inject `IOptions<FoodsOptions>`, `TimeProvider`, `ILogger<T>`, other
     interfaces, and typed `HttpClient`s through the primary constructor.
   - Log with `[LoggerMessage]` methods.
4. **Registration.** In `ServiceCollectionExtensions.AddMaxxingServices`:
   - `AddOptions<FoodsOptions>().Bind(...).ValidateDataAnnotations().ValidateOnStart()`
   - register the service with the right lifetime (Scoped by default)
   - use `AddHttpClient<T>()` for outbound HTTP
5. **Endpoints.** In `Dao.Maxxing.Api/Endpoints/FoodsEndpoints.cs`, add
   `MapFoodsEndpoints()`:
   - map the group with `.RequireAuthorization("api")` and `.WithTags("Foods")`
   - give each endpoint `.WithName(...)`
   - inject the Core interface
   - return `TypedResults`, using `TypedResults.Problem` for expected failures

   Then call `app.MapFoodsEndpoints()` in `Program.cs`.
6. **Tests.**
   - `tests/Dao.Maxxing.Services.Tests/`: unit tests for the service logic,
     plus a test that invalid options are rejected.
   - `tests/Dao.Maxxing.Api.Tests/`: through `ApiFactory`, a signed-out call
     returns a 401 ProblemDetails, a signed-in call succeeds, and error paths
     return ProblemDetails.
   - Swap outbound providers with fakes via `factory.ConfigureServices`. Tests
     never call real external APIs.
7. **Verify.**

   ```bash
   dotnet build Dao.Maxxing.slnx -c Release && dotnet test Dao.Maxxing.slnx -c Release --no-build
   ```

## Before finishing, check that

- [ ] Nothing in Core references Services, Api, or any package.
- [ ] No `IConfiguration["..."]`, `DateTime.Now`, `new SomeService(...)`, or
      `GetService` calls in app code.
- [ ] Every new options class validates on start and has a validation test.
- [ ] Every error path returns ProblemDetails.
- [ ] No secrets or personal data appear in logs or committed config.
