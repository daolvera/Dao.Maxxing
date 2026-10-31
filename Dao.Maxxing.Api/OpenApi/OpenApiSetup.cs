using System.Reflection;
using System.Text.Json.Serialization;

namespace Dao.Maxxing.Api.OpenApi;

public static class OpenApiSetup
{
    /// <summary>
    /// Registers the OpenAPI document. Every build also writes it to /openapi through
    /// Microsoft.Extensions.ApiDescription.Server, and the Angular client is generated from that file.
    /// </summary>
    public static WebApplicationBuilder AddApiOpenApi(this WebApplicationBuilder builder)
    {
        builder.Services.AddOpenApi();

        // The web defaults also accept numbers sent as strings, which makes every number
        // `integer | string` in the document and so in the generated client. The API only takes JSON numbers.
        builder.Services.ConfigureHttpJsonOptions(options =>
            options.SerializerOptions.NumberHandling = JsonNumberHandling.Strict);

        // The build-time generator (GetDocument.Insider) starts the app without user secrets or
        // deployment settings. Placeholders let startup validation pass; they never reach a real host.
        if (Assembly.GetEntryAssembly()?.GetName().Name == "GetDocument.Insider")
        {
            builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Authentication:PublicOrigin"] = "https://localhost",
                ["Authentication:Google:ClientId"] = "openapi-build",
                ["Authentication:Google:ClientSecret"] = "openapi-build",
            });
        }

        return builder;
    }
}
