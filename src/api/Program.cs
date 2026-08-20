var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHealthChecks();

var app = builder.Build();

// Liveness: answers "the service is running" without touching a database.
app.MapHealthChecks("/health/live");

app.Run();
