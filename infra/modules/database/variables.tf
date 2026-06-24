variable "environment" {
  description = "Environment identifier — PR number (e.g. pr-42) or production"
  type        = string
}

variable "postgresql_server_name" {
  description = "Name of the shared Azure PostgreSQL Flexible Server"
  type        = string
}

variable "postgresql_server_fqdn" {
  description = "FQDN of the shared Azure PostgreSQL Flexible Server"
  type        = string
}

variable "postgresql_resource_group" {
  description = "Resource group containing the shared PostgreSQL Flexible Server"
  type        = string
}
