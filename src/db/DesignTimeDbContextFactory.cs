using Ludium.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Npgsql;

namespace Ludium.Db;

public sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var password = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD")
            ?? throw new InvalidOperationException(
                "POSTGRES_PASSWORD must be set to run design-time EF Core commands (matches docker-compose).");

        var connectionString = new NpgsqlConnectionStringBuilder
        {
            Host = Environment.GetEnvironmentVariable("POSTGRES_HOST") ?? "localhost",
            Port = int.Parse(Environment.GetEnvironmentVariable("POSTGRES_PORT") ?? "5432"),
            Database = Environment.GetEnvironmentVariable("POSTGRES_DB") ?? "ludium",
            Username = Environment.GetEnvironmentVariable("POSTGRES_USER") ?? "ludium",
            Password = password,
        }.ConnectionString;

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(connectionString, npgsql => npgsql.MigrationsAssembly("Ludium.Db"))
            .Options;

        return new AppDbContext(options);
    }
}
