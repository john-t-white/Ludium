output "url" {
  description = "HTTPS URL of the web App Service"
  value       = "https://${azurerm_linux_web_app.web.default_hostname}"
}

output "app_service_name" {
  description = "Name of the web App Service — used by GitHub Actions for zip deployment"
  value       = azurerm_linux_web_app.web.name
}

output "principal_id" {
  description = "Object ID of the web App Service system-assigned managed identity"
  value       = azurerm_linux_web_app.web.identity[0].principal_id
}
