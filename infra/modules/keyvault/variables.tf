variable "environment" {
  description = "Environment identifier — PR number (e.g. pr-42) or production"
  type        = string
}

variable "location" {
  description = "Azure region for all resources"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group to deploy Key Vault into"
  type        = string
}

variable "subnet_id" {
  description = "Subnet ID for the Key Vault private endpoint"
  type        = string
}

variable "vnet_id" {
  description = "Virtual network ID for the private DNS zone VNet link"
  type        = string
}

variable "shared_resource_group_name" {
  description = "Name of the shared resource group where the private DNS zone for Key Vault is managed"
  type        = string
  default     = "rg-ludium-shared"
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
}
