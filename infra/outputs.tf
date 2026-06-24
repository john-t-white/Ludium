output "api_url" {
  description = "HTTPS URL of the deployed API App Service"
  value       = module.api.url
}

output "web_url" {
  description = "HTTPS URL of the deployed web App Service"
  value       = module.web.url
}

output "api_app_service_name" {
  description = "Name of the API App Service — used by GitHub Actions to deploy via az webapp deploy"
  value       = module.api.app_service_name
  sensitive   = true
}

output "web_app_service_name" {
  description = "Name of the web App Service — used by GitHub Actions to deploy via az webapp deploy"
  value       = module.web.app_service_name
  sensitive   = true
}
