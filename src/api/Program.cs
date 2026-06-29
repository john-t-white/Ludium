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
    if (System.Net.IPNetwork.TryParse(cidr, out var network))
        forwardedHeadersOptions.KnownIPNetworks.Add(network);
    else
        app.Logger.LogWarning("ForwardedHeaders:TrustedNetworks entry '{Cidr}' is not a valid CIDR — skipped.", cidr);
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
