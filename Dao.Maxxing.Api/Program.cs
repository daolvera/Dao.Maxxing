using Dao.Maxxing.Api.Authentication;
using Dao.Maxxing.Api.Data;
using Dao.Maxxing.Api.Endpoints;
using Dao.Maxxing.Api.Errors;
using Dao.Maxxing.Api.OpenApi;
using Dao.Maxxing.Services;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();
builder.AddApiOpenApi();
builder.Services.AddApiProblemDetails();
builder.Services.AddMaxxingServices(builder.Configuration);
builder.AddApiDatabase();
builder.AddGoogleBffAuthentication();

var app = builder.Build();
app.UseApiProblemDetails();
app.UseForwardedHeaders();

app.MapApiOpenApi();

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
app.MapGoogleBffAuthentication();

app.MapDefaultEndpoints();
app.MapWeatherEndpoints();

app.MapFallbackToFile("index.html");

app.Run();

public partial class Program;
