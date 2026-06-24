data "azurerm_client_config" "current" {}

# Look up the shared private DNS zone for Key Vault.
# This zone is provisioned once in rg-ludium-shared and shared across all environments.
# Each environment links its own VNet to this zone rather than creating a new zone
# (Azure enforces one zone per name per resource group, and all PRs share rg-ludium-pr).
data "azurerm_private_dns_zone" "keyvault" {
  name                = "privatelink.vaultcore.azure.net"
  resource_group_name = var.shared_resource_group_name
}

locals {
  # Key Vault names must be 3-24 characters, alphanumeric and hyphens only.
  # Strip "pr-" prefix so the name stays short.
  # "kv-ludium-" = 10 chars, leaving 14 chars for the environment suffix.
  # Examples: pr-42 -> "kv-ludium-42", production -> "kv-ludium-production"
  env_suffix = replace(var.environment, "pr-", "")
  kv_name    = "kv-ludium-${substr(local.env_suffix, 0, min(14, length(local.env_suffix)))}"
}

resource "azurerm_key_vault" "main" {
  name                          = local.kv_name
  location                      = var.location
  resource_group_name           = var.resource_group_name
  tenant_id                     = data.azurerm_client_config.current.tenant_id
  sku_name                      = "standard"
  soft_delete_retention_days    = 7
  purge_protection_enabled      = false
  enable_rbac_authorization     = true
  public_network_access_enabled = false
  tags                          = var.tags
}

# Link the per-environment VNet to the shared Key Vault private DNS zone.
# Each PR environment adds its own VNet link — the shared zone resolves
# private endpoint addresses for all linked VNets.
resource "azurerm_private_dns_zone_virtual_network_link" "keyvault" {
  name                  = "pdnslink-ludium-${var.environment}-kv"
  resource_group_name   = var.shared_resource_group_name
  private_dns_zone_name = data.azurerm_private_dns_zone.keyvault.name
  virtual_network_id    = var.vnet_id
  registration_enabled  = false
  tags                  = var.tags
}

resource "azurerm_private_endpoint" "keyvault" {
  name                = "pe-ludium-${var.environment}-kv"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_id
  tags                = var.tags

  private_service_connection {
    name                           = "psc-ludium-${var.environment}-kv"
    private_connection_resource_id = azurerm_key_vault.main.id
    subresource_names              = ["vault"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "pdnszg-ludium-${var.environment}-kv"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.keyvault.id]
  }
}
