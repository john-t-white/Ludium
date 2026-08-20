using Microsoft.AspNetCore.Diagnostics.HealthChecks;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHealthChecks();

var app = builder.Build();

// Liveness: the service is running. The predicate excludes every registered
// check — including ones added later — so this keeps answering while a
// dependency such as the database is down. Readiness reports dependency health.
app.MapHealthChecks("/health/live", new HealthCheckOptions { Predicate = _ => false });

app.Run();
