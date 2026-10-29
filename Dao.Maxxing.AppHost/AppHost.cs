var builder = DistributedApplication.CreateBuilder(args);

var api = builder.AddProject<Projects.Dao_Maxxing_Api>("api")
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
