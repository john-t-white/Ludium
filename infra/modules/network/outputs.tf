output "vnet_id" {
  description = "Resource ID of the virtual network"
  value       = azurerm_virtual_network.main.id
}

output "vnet_name" {
  description = "Name of the virtual network"
  value       = azurerm_virtual_network.main.name
}

output "api_subnet_id" {
  description = "Resource ID of the API App Service subnet"
  value       = azurerm_subnet.api.id
}

output "private_endpoints_subnet_id" {
  description = "Resource ID of the private endpoints subnet"
  value       = azurerm_subnet.private_endpoints.id
}
