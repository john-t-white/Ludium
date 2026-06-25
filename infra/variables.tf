variable "environment" {
  description = "Environment identifier — PR number (e.g. pr-42) or production"
  type        = string

  validation {
    condition     = can(regex("^(pr-[0-9]+|production)$", var.environment))
    error_message = "environment must be 'production' or match 'pr-{number}' (e.g. pr-42)"
  }
}

variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "eastus2"
}

variable "resource_group_name" {
  description = "Name of the pre-existing resource group that PR resources are deployed into"
  type        = string
  default     = "rg-ludium-pr"
}

variable "api_sku" {
  description = "App Service plan SKU — controls compute size for both API and web app services"
  type        = string
  default     = "B1"
}

variable "shared_resource_group_name" {
  description = "Name of the resource group holding shared infrastructure (PostgreSQL server, Key Vault)"
  type        = string
  default     = "rg-ludium-pr-infra"
}

variable "postgresql_server_name" {
  description = "Name of the shared Azure PostgreSQL Flexible Server (provisioned once via infra/shared/)"
  type        = string
}

variable "postgresql_server_fqdn" {
  description = "FQDN of the shared Azure PostgreSQL Flexible Server"
  type        = string
}

variable "vnet_cidr" {
  description = "CIDR block for this environment's VNet. Must not overlap with the shared VNet (172.16.0.0/16) or other PR VNets. Workflow computes this as 10.{PR_NUMBER}.0.0/16."
  type        = string
  default     = "10.0.0.0/16"
}
