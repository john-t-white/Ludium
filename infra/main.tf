locals {
  tags = {
    environment = var.environment
    project     = "ludium"
    managed_by  = "terraform"
  }
}

data "azurerm_resource_group" "pr" {
  name = var.resource_group_name
}

data "azurerm_resource_group" "shared" {
  name = var.shared_resource_group_name
}

data "azurerm_postgresql_flexible_server" "shared" {
  name                = var.postgresql_server_name
  resource_group_name = data.azurerm_resource_group.shared.name
}

data "azurerm_virtual_network" "shared" {
  name                = "vnet-ludium-shared"
  resource_group_name = data.azurerm_resource_group.shared.name
}

data "azurerm_private_dns_zone" "postgresql" {
  name                = "psql-ludium-pr-infra.private.postgres.database.azure.com"
  resource_group_name = data.azurerm_resource_group.shared.name
}

module "network" {
  source = "./modules/network"

  environment                      = var.environment
  location                         = var.location
  resource_group_name              = data.azurerm_resource_group.pr.name
  vnet_cidr                        = var.vnet_cidr
  shared_vnet_id                   = data.azurerm_virtual_network.shared.id
  shared_vnet_name                 = data.azurerm_virtual_network.shared.name
  shared_resource_group_name       = data.azurerm_resource_group.shared.name
  postgresql_private_dns_zone_name = data.azurerm_private_dns_zone.postgresql.name
  tags                             = local.tags
}

module "keyvault" {
  source = "./modules/keyvault"

  environment                = var.environment
  location                   = var.location
  resource_group_name        = data.azurerm_resource_group.pr.name
  subnet_id                  = module.network.private_endpoints_subnet_id
  vnet_id                    = module.network.vnet_id
  shared_resource_group_name = data.azurerm_resource_group.shared.name
  tags                       = local.tags
}

module "database" {
  source = "./modules/database"

  environment               = var.environment
  postgresql_server_name    = data.azurerm_postgresql_flexible_server.shared.name
  postgresql_server_fqdn    = var.postgresql_server_fqdn
  postgresql_resource_group = data.azurerm_resource_group.shared.name
}

module "api" {
  source = "./modules/api"

  environment                      = var.environment
  location                         = var.location
  resource_group_name              = data.azurerm_resource_group.pr.name
  subnet_id                        = module.network.api_subnet_id
  keyvault_id                      = module.keyvault.keyvault_id
  keyvault_uri                     = module.keyvault.keyvault_uri
  postgresql_server_name           = data.azurerm_postgresql_flexible_server.shared.name
  postgresql_server_resource_group = data.azurerm_resource_group.shared.name
  postgresql_server_fqdn           = var.postgresql_server_fqdn
  database_name                    = module.database.database_name
  api_sku                          = var.api_sku
  tags                             = local.tags
}

module "web" {
  source = "./modules/web"

  environment         = var.environment
  location            = var.location
  resource_group_name = data.azurerm_resource_group.pr.name
  app_service_plan_id = module.api.app_service_plan_id
  api_url             = module.api.url
  tags                = local.tags
}
