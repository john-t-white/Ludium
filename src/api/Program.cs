using System.Text;
using System.Threading.RateLimiting;
using FluentValidation;
using Ludium.Api.Data;
using Ludium.Api.Features.Auth;
using Ludium.Api.Features.AppInfo;
using Ludium.Api.Features.Users;
using Ludium.Api.Infrastructure.Auth;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

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

builder.Services.AddValidatorsFromAssemblyContaining<Program>();

builder.Services.AddScoped<AppInfoService>();

builder.Services.Configure<GoogleAuthOptions>(
    builder.Configuration.GetSection(GoogleAuthOptions.SectionName));

// Fail fast at startup: an HS256 signing key must be present and at least 256 bits (32 bytes).
// The real key is supplied via user-secrets locally and Key Vault in deployed environments.
// Bound and validated lazily so configuration overrides (including tests) are honored.
builder.Services.AddOptions<JwtOptions>()
    .Bind(builder.Configuration.GetSection(JwtOptions.SectionName))
    .Validate(
        options => Encoding.UTF8.GetByteCount(options.SigningKey) >= 32,
        "Jwt:SigningKey is missing or shorter than 32 bytes. Configure a 256-bit signing key via user-secrets or Key Vault.")
    .ValidateOnStart();

builder.Services.AddSingleton<IGoogleTokenValidator, GoogleTokenValidator>();
builder.Services.AddSingleton<IJwtIssuer, JwtIssuer>();
builder.Services.AddScoped<AuthService>();

builder.Services.AddAuthentication().AddJwtBearer();

builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
    .Configure<IOptions<JwtOptions>>((bearer, jwt) =>
    {
        var jwtOptions = jwt.Value;
        bearer.MapInboundClaims = false;
        bearer.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtOptions.Audience,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SigningKey)),
            ClockSkew = TimeSpan.FromSeconds(30),
        };
    });

builder.Services.AddAuthorization();

var authPermitLimit = builder.Configuration.GetValue<int?>("Auth:RateLimit:PermitLimit") ?? 10;
var authWindowSeconds = builder.Configuration.GetValue<int?>("Auth:RateLimit:WindowSeconds") ?? 60;

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("auth", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = authPermitLimit,
                Window = TimeSpan.FromSeconds(authWindowSeconds),
                QueueLimit = 0,
            }));
});

builder.Services.AddHsts(options =>
{
    options.MaxAge = TimeSpan.FromDays(365);
    options.IncludeSubDomains = true;
    options.Preload = false;
});

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
    context.Response.Headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'";
    await next();
});

app.UseHttpsRedirection();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.MapAppInfoEndpoints();
app.MapAuthEndpoints(app.Environment, app.Configuration);
app.MapUserEndpoints();

app.Run();

// Make Program accessible to the test assembly via WebApplicationFactory<Program>
public partial class Program { }
