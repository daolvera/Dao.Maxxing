# Authentication setup

This project protects `/api/weatherforecast` and, when included, the
`/hubs/notifications` hub and `/api/notify` endpoint. The frontend shell, health
probes, and authentication protocol endpoints remain public. A frontend route
guard is not an API security boundary: authorization is enforced by the API.

## Local HTTPS and configuration

Trust the .NET development certificate before starting:

```powershell
dotnet dev-certs https --trust
```

Run `aspire start` from the generated solution directory. For authenticated
variants Aspire runs the Angular HTTPS dev server at **https://localhost:4200**.
The `start:auth` script exports your existing development certificate into the
ignored `.certificates` directory; never commit that directory or its private
key. If port 4200 is occupied, stop the specific conflicting app or change the
AppHost endpoint, `Authentication:PublicOrigin`, and all registered redirect URIs
together. Multiple authenticated templates need different ports.

The Angular proxy preserves the public Host and forwards `/api`, `/signin-google`,
`/connect`, `/.well-known`, and optional `/hubs` to the API. Open the **frontend**
URL, not the API resource URL, for sign-in. Production serves frontend and API on
the same HTTPS origin. Public frontend auth configuration comes from
`/api/auth/config`; secrets are never returned by that endpoint.

Set secrets against the **API** project:

```powershell
dotnet user-secrets set "Authentication:PublicOrigin" "https://localhost:4200" --project Dao.Maxxing.Api
```

Missing required settings fail API startup with an actionable error. Frontend
setup, sign-in, and renewal failures are displayed rather than silently granting
anonymous access.

## Register Google sign-in

1. Create/select a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Configure Google Auth Platform branding, audience/consent screen, and contact
   information. For an external app in Testing, add the Google accounts that
   will test sign-in to the test-user list. Follow Google's verification
   requirements before making the consent screen available publicly.
3. Create an OAuth client of type **Web application**, not Android or desktop.
4. Register the exact authorized redirect URI:
   **https://localhost:4200/signin-google**. The server-side handler does not
   require loading the Google browser SDK or configuring a JavaScript origin.
5. Store the client ID and secret on the API:

```powershell
dotnet user-secrets set "Authentication:Google:ClientId" "<web-client-id>" --project Dao.Maxxing.Api
dotnet user-secrets set "Authentication:Google:ClientSecret" "<client-secret>" --project Dao.Maxxing.Api
```

Only basic identity/profile/email scopes are requested. No Google API access is
granted to callers of your API. Google's ID token proves identity; a Google API
access token is not an access token for this application's API.

For production add `https://your-public-host/signin-google` to that OAuth client's
redirect URIs (prefer a separate production client). Set
`Authentication__PublicOrigin`, `Authentication__Google__ClientId`, and
`Authentication__Google__ClientSecret` through deployment configuration/secrets.
Never put the client secret into Angular, `appsettings.json`, or a template CLI
argument captured in shell history.

`redirect_uri_mismatch` means the public scheme/host/port/path does not match
Google's registered value exactly. A blocked consent screen generally means a
test user, publishing status, organization policy, or verification requirement
needs attention. A cancelled login returns a visible error; it does not create
a session.

## GoogleCookie: server-owned session

ASP.NET Core's Google handler completes sign-in and creates a Secure, HttpOnly,
SameSite=Lax application cookie. Angular requests `/api/auth/me` for the
server-validated user; JavaScript cannot read the session credential.
The session lasts eight hours with sliding expiration. Sign-out is an
authenticated POST to `/api/auth/logout`.

The API validates an antiforgery token on state-changing authenticated API
requests and SignalR negotiation. Angular's interceptor and SignalR service
obtain that token from `/api/auth/csrf` and send `X-XSRF-TOKEN`. Do not replace
logout with a GET or remove CSRF protection when adding mutation endpoints.
API 401/403 responses do not redirect to Google.

Cookies suit this same-origin web app and do not require a user database.
Choose a token-based mode for native/mobile clients or independently hosted APIs.
There is no custom JWT/refresh service in this variant.



## Production and operational checks

- Configure the public HTTPS origin and provider redirects before deployment.
  Behind a reverse proxy, explicitly configure trusted proxy addresses/networks
  using ASP.NET Core's ForwardedHeadersOptions. The template retains framework
  trust restrictions; never clear them to trust arbitrary forwarded headers.
  Set production AllowedHosts to the public hostname.
- Persist/share ASP.NET Core Data Protection keys across restarts/replicas.
  Protect them at rest using the deployment platform's supported key storage.
  Otherwise authentication/correlation cookies may become invalid after
  redeployment or when another replica handles a callback.
- Keep health checks anonymous. Protect all new business API endpoints with the
  `api` policy. Do not put an authorization fallback policy on OAuth callbacks
  or discovery endpoints.
- SignalR, when included, uses the selected auth method, reconnects only while
  signed in, and stops on sign-out. Bearer query tokens are accepted only on
  `/hubs/notifications`. Ensure reverse-proxy/access logging redacts query
  tokens and Authorization/Cookie headers.
- Verify sign-in, refresh/expiry where applicable, a protected weather request,
  SignalR notification, sign-out, rejected anonymous access, and cancelled
  sign-in using real Google/Entra accounts after registration. Automated local
  provider tests cannot verify your organization's cloud consent configuration.

References: [Google server-side sign-in](https://learn.microsoft.com/aspnet/core/security/authentication/social/google-logins),
[Google token verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token),
[OpenIddict](https://documentation.openiddict.com/),
[MSAL Angular](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-angular),
[Microsoft.Identity.Web](https://learn.microsoft.com/entra/identity-platform/scenario-protected-web-api-app-configuration).
