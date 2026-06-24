variable "environment" {
  description = "Environment identifier — PR number (e.g. pr-42) or production"
  type        = string
}

variable "location" {
  description = "Azure region for all resources"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group to deploy API resources into"
  type        = string
}

variable "subnet_id" {
  description = "Subnet ID for App Service VNet integration"
  type        = string
}

variable "keyvault_id" {
  description = "Resource ID of the per-environment Key Vault"
  type        = string
}

variable "keyvault_uri" {
  description = "URI of the per-environment Key Vault (used for Key Vault reference app settings)"
  type        = string
}

variable "postgresql_server_name" {
  description = "Name of the shared PostgreSQL Flexible Server"
  type        = string
}

variable "postgresql_server_resource_group" {
  description = "Resource group name of the shared PostgreSQL Flexible Server"
  type        = string
}

variable "postgresql_server_fqdn" {
  description = "FQDN of the shared PostgreSQL Flexible Server"
  type        = string
}

variable "database_name" {
  description = "Name of the per-environment PostgreSQL database"
  type        = string
}

variable "api_sku" {
  description = "App Service plan SKU name (e.g. B1, P1v3)"
  type        = string
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
}
