output "database_name" {
  description = "Name of the per-environment PostgreSQL database"
  value       = azurerm_postgresql_flexible_server_database.main.name
}

output "postgresql_server_fqdn" {
  description = "FQDN of the shared PostgreSQL Flexible Server"
  value       = var.postgresql_server_fqdn
}
