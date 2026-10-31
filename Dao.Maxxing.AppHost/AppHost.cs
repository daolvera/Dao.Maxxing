var builder = DistributedApplication.CreateBuilder(args);

// Local SQL Server in a container that outlives AppHost runs, with data kept in a volume.
// Azure SQL (serverless) replaces it in D3 #12 under the same "maxxing" connection name.
var sql = builder.AddSqlServer("sql")
    .WithLifetime(ContainerLifetime.Persistent)
    .WithDataVolume();
var database = sql.AddDatabase("maxxing");

var api = builder.AddProject<Projects.Dao_Maxxing_Api>("api")
    .WithReference(database)
    .WaitFor(database)
    .WithHttpHealthCheck("/health")
    .WithExternalHttpEndpoints();

var frontend = builder.AddJavaScriptApp("frontend", "../Dao.Maxxing.Web")
    .WithRunScript("start:auth")
    .WithReference(api)
    .WaitFor(api)
    .WithHttpsEndpoint(port: 4200, targetPort: 4200, env: "PORT", isProxied: false)
    .WithHttpHealthCheck("/");

api.PublishWithContainerFiles(frontend, "wwwroot");

builder.Build().Run();
