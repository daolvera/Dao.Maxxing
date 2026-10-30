using System.Diagnostics;

namespace Dao.Maxxing.Api.Errors;

public static class ProblemDetailsSetup
{
    /// <summary>
    /// Every error response is RFC 9457 problem details: unhandled exceptions (500, details hidden outside
    /// Development), empty 4xx/5xx responses such as 401/403/404, and explicit TypedResults.Problem calls.
    /// </summary>
    public static IServiceCollection AddApiProblemDetails(this IServiceCollection services) =>
        services.AddProblemDetails(options => options.CustomizeProblemDetails = context =>
            context.ProblemDetails.Extensions["traceId"] = Activity.Current?.Id ?? context.HttpContext.TraceIdentifier);

    public static WebApplication UseApiProblemDetails(this WebApplication app)
    {
        app.UseExceptionHandler();
        app.UseStatusCodePages();
        return app;
    }
}
