# Authentication (A2)

Dao.Maxxing is a personal app with exactly one user. Sign-in is Google OAuth
run by the API as a backend-for-frontend (BFF): the server completes the flow
and keeps the session in an HttpOnly cookie, so the browser never holds a
token. Only the configured **owner** account can sign in or call the API.

The code is in `Dao.Maxxing.Api/Authentication/`.

## How it works

- **Sign-in.** Angular navigates to `GET /api/auth/login`, which challenges
  Google. Google redirects back to `/signin-google`, and the handler checks the
  account's subject ID (`sub`) against `Authentication:Owner:GoogleSubject`.
  - Owner: a `__Host-Dao.Session` cookie is issued (Secure, HttpOnly,
    SameSite=Lax, 8 hours sliding).
  - Anyone else: no cookie is issued. The browser lands on
    `/?authError=not-owner` and the app explains that it's private.
  - A cancelled or failed sign-in lands on `/?authError=google`.
- **Authorization.** Every `/api` endpoint requires the `api` policy: a
  signed-in user **and** the owner's subject. The second check rejects
  (403) a session that outlived a change of owner. A signed-out call returns
  401; API calls never redirect to Google.
- **Current user.** Angular reads `GET /api/auth/me` for the server-validated
  user. JavaScript cannot read the session cookie.
- **CSRF.** Every authenticated mutating `/api` request (anything other than
  GET, HEAD, OPTIONS, or TRACE) must send the antiforgery token from
  `GET /api/auth/csrf` in the `X-XSRF-TOKEN` header. A missing or wrong token
  returns a 400 ProblemDetails. Angular's interceptor (`auth/auth.config.ts`)
  adds it. Don't add mutating GET endpoints, and don't exempt new endpoints.
- **Sign-out** is `POST /api/auth/logout` (so it needs the CSRF token too).
- **Keys.** The session, OAuth correlation, and antiforgery cookies are
  encrypted with ASP.NET Core Data Protection keys stored in the app database
  (`DataProtectionKeys` table). Sessions therefore survive restarts and
  deployments and work across instances.

The `/api/auth/*` endpoints are browser plumbing used by the hand-written
`AuthService`, so they're excluded from the OpenAPI document and the
generated client.

## Settings

All under `Authentication` and validated at startup; a missing value fails
startup with a message naming the key.

| Key | What | Where |
|---|---|---|
| `PublicOrigin` | Public HTTPS origin, no path | `appsettings.Development.json` locally (`https://localhost:4200`); deployment config |
| `Google:ClientId`, `Google:ClientSecret` | OAuth web client | User secrets; deployment secrets |
| `Owner:GoogleSubject` | The owner's Google `sub` | User secrets; deployment secrets |

## Local setup

1. Trust the development certificate: `dotnet dev-certs https --trust`.
2. In [Google Cloud Console](https://console.cloud.google.com/), create an
   OAuth client of type **Web application** with the redirect URI
   `https://localhost:4200/signin-google`. While the consent screen is in
   Testing, add your account as a test user.
3. Store the client on the API project:

   ```powershell
   dotnet user-secrets set "Authentication:Google:ClientId" "<client-id>" --project Dao.Maxxing.Api
   dotnet user-secrets set "Authentication:Google:ClientSecret" "<client-secret>" --project Dao.Maxxing.Api
   ```

4. Set the owner. If you don't know your Google subject ID, set any
   placeholder, sign in once, and read it from the API's warning log
   *Rejected Google sign-in for non-owner subject {GoogleSubject}* in the
   Aspire dashboard. Then:

   ```powershell
   dotnet user-secrets set "Authentication:Owner:GoogleSubject" "<your-sub>" --project Dao.Maxxing.Api
   ```

5. Run `aspire start` and open the **frontend** URL
   (https://localhost:4200), not the API's. The Angular proxy forwards `/api`
   and `/signin-google` to the API and preserves the public host.

The subject is used instead of the email address because it never changes,
while an address can be renamed or reassigned.

## Production

- Use a separate production OAuth client with redirect URI
  `https://<public-host>/signin-google`.
- Set `Authentication__PublicOrigin`, `Authentication__Google__ClientId`,
  `Authentication__Google__ClientSecret`, and
  `Authentication__Owner__GoogleSubject` through deployment secrets (D3 #12).
  Never put them in `appsettings*.json` or the Angular app.
- Data Protection keys are stored in Azure SQL, which encrypts data at rest.
  D3 should also wrap the keys with Key Vault (`ProtectKeysWithAzureKeyVault`).
- Behind a reverse proxy, configure the trusted proxies in
  `ForwardedHeadersOptions`. Never clear the framework's restrictions to trust
  arbitrary forwarded headers. Set `AllowedHosts` to the public host.

## Troubleshooting

- `redirect_uri_mismatch`: the public scheme, host, port, or path doesn't
  match the redirect URI registered in Google exactly.
- Signed in with the right account but sent to `authError=not-owner`: the
  configured subject doesn't match. Compare it with the logged subject.
- Everyone signed out after a deploy: the API couldn't read the
  `DataProtectionKeys` table, so check its database connection.

## Tests

`tests/Dao.Maxxing.Api.Tests/AuthenticationTests.cs` covers signed-out 401,
non-owner 403, the owner check at Google sign-in, CSRF rejection and
acceptance, key persistence, and the startup validation of the owner setting.
`ApiFactory` replaces the session cookie with a header-based test scheme as
the default, so the real `api` policy and CSRF middleware run in every test.
