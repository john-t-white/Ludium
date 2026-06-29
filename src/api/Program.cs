using System.Net;
using FluentValidation;
using Ludium.Api.Data;
using Ludium.Api.Features.AppInfo;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        var allowedOrigins = builder.Configuration
            .GetSection("Cors:AllowedOrigins")
            .Get<string[]>() ?? [];

        policy.WithOrigins(allowedOrigins)
              .WithHeaders("Content-Type", "Accept", "Authorization")
              .WithMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS");
    });
});

builder.Services.AddDbContext<AppDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    options.UseNpgsql(connectionString);
});

builder.Services.AddOpenApi();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

builder.Services.AddScoped<AppInfoService>();

var app = builder.Build();

var forwardedHeadersOptions = new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedProto
};

// Loopback defaults are retained; only the configured proxy CIDRs are added as trusted.
var trustedNetworks = app.Configuration
    .GetSection("ForwardedHeaders:TrustedNetworks")
    .Get<string[]>() ?? [];
foreach (var cidr in trustedNetworks)
{
    var parts = cidr.Split('/');
    if (parts.Length == 2
        && IPAddress.TryParse(parts[0], out var ip)
        && int.TryParse(parts[1], out var prefix))
    {
        forwardedHeadersOptions.KnownIPNetworks.Add(new System.Net.IPNetwork(ip, prefix));
    }
}

app.UseForwardedHeaders(forwardedHeadersOptions);

app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers["X-Permitted-Cross-Domain-Policies"] = "none";
    if (!app.Environment.IsDevelopment())
    {
        context.Response.Headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
    }
    await next();
});

app.UseHttpsRedirection();

app.UseCors("AllowFrontend");

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.MapAppInfoEndpoints();

app.Run();

// Make Program accessible to the test assembly via WebApplicationFactory<Program>
public partial class Program { }
