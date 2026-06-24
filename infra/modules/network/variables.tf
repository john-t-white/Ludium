variable "environment" {
  description = "Environment identifier — PR number (e.g. pr-42) or production"
  type        = string
}

variable "location" {
  description = "Azure region for all resources"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group to deploy network resources into"
  type        = string
}

variable "vnet_cidr" {
  description = "CIDR block for this environment's VNet. Must not overlap with the shared VNet (172.16.0.0/16) or other PR VNets. Workflow computes this as 10.{PR_NUMBER}.0.0/16."
  type        = string
}

variable "shared_vnet_id" {
  description = "Resource ID of the shared VNet (vnet-ludium-shared) to peer with"
  type        = string
}

variable "shared_vnet_name" {
  description = "Name of the shared VNet (vnet-ludium-shared)"
  type        = string
}

variable "shared_resource_group_name" {
  description = "Name of the shared resource group (rg-ludium-shared)"
  type        = string
}

variable "postgresql_private_dns_zone_name" {
  description = "Name of the PostgreSQL private DNS zone hosted in the shared resource group"
  type        = string
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
}
