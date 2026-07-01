using Ludium.Api.Features.Users;
using Microsoft.EntityFrameworkCore;

namespace Ludium.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");

            entity.HasKey(u => u.Id).HasName("pk_users");

            entity.Property(u => u.Id)
                .HasColumnName("id")
                .ValueGeneratedNever();

            entity.Property(u => u.GoogleSubjectId)
                .HasColumnName("google_subject_id")
                .IsRequired();

            entity.Property(u => u.Name)
                .HasColumnName("name")
                .IsRequired();

            entity.Property(u => u.CreatedAt)
                .HasColumnName("created_at")
                .HasDefaultValueSql("now()");

            entity.HasIndex(u => u.GoogleSubjectId)
                .IsUnique()
                .HasDatabaseName("uq_users_google_subject_id");
        });
    }
}
