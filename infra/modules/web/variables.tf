variable "environment" {
  description = "Environment identifier — PR number (e.g. pr-42) or production"
  type        = string
}

variable "location" {
  description = "Azure region for all resources"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group to deploy the web App Service into"
  type        = string
}

variable "app_service_plan_id" {
  description = "Resource ID of the App Service plan — shared with the API (passed from the api module)"
  type        = string
}

variable "api_url" {
  description = "HTTPS URL of the API App Service — set as NEXT_PUBLIC_API_URL app setting"
  type        = string
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
}
