output "server_fqdn" {
  description = "FQDN of the shared PostgreSQL Flexible Server — pass to infra/ as postgresql_server_fqdn"
  value       = azurerm_postgresql_flexible_server.main.fqdn
}

output "server_name" {
  description = "Name of the shared PostgreSQL Flexible Server — pass to infra/ as postgresql_server_name"
  value       = azurerm_postgresql_flexible_server.main.name
}

output "vnet_id" {
  description = "Resource ID of the shared virtual network"
  value       = azurerm_virtual_network.main.id
}

output "vnet_name" {
  description = "Name of the shared virtual network"
  value       = azurerm_virtual_network.main.name
}

output "postgresql_private_dns_zone_name" {
  description = "Name of the shared PostgreSQL private DNS zone"
  value       = azurerm_private_dns_zone.postgresql.name
}
