output "url" {
  description = "HTTPS URL of the API App Service"
  value       = "https://${azurerm_linux_web_app.api.default_hostname}"
}

output "app_service_name" {
  description = "Name of the API App Service — used by GitHub Actions for zip deployment"
  value       = azurerm_linux_web_app.api.name
}

output "app_service_plan_id" {
  description = "Resource ID of the App Service plan — shared with the web module"
  value       = azurerm_service_plan.main.id
}

output "principal_id" {
  description = "Object ID of the API App Service system-assigned managed identity"
  value       = azurerm_linux_web_app.api.identity[0].principal_id
  sensitive   = true
}
