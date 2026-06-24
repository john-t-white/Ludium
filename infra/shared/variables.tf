variable "location" {
  description = "Azure region for shared resources"
  type        = string
  default     = "eastus2"
}

variable "resource_group_name" {
  description = "Name of the shared resource group"
  type        = string
  default     = "rg-ludium-pr-shared"
}

variable "postgresql_version" {
  description = "PostgreSQL major version — must be kept in sync with docker-compose.yml"
  type        = string
  default     = "16"
}

variable "postgresql_sku" {
  description = "PostgreSQL Flexible Server SKU name"
  type        = string
  default     = "B_Standard_B1ms"
}

variable "postgresql_storage_mb" {
  description = "PostgreSQL Flexible Server storage in MB"
  type        = number
  default     = 32768
}

variable "entra_admin_object_id" {
  description = "Object ID of the Entra ID user or group to set as PostgreSQL Entra ID administrator"
  type        = string
}

variable "entra_admin_principal_name" {
  description = "UPN or display name of the Entra ID PostgreSQL administrator (used as the pg role name)"
  type        = string
}
