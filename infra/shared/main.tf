locals {
  tags = {
    environment = "shared"
    project     = "ludium"
    managed_by  = "terraform"
  }
}

data "azurerm_client_config" "current" {}

data "azurerm_resource_group" "shared" {
  name = var.resource_group_name
}

# ----------------------------------------------------------------------------
# Shared virtual network — hosts the PostgreSQL delegated subnet.
# All per-PR VNets peer to this VNet to reach the database.
# ----------------------------------------------------------------------------
resource "azurerm_virtual_network" "main" {
  name                = "vnet-ludium-shared"
  location            = var.location
  resource_group_name = data.azurerm_resource_group.shared.name
  address_space       = ["172.16.0.0/16"]
  tags                = local.tags
}

resource "azurerm_subnet" "postgresql" {
  name                 = "snet-postgresql"
  resource_group_name  = data.azurerm_resource_group.shared.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["172.16.1.0/24"]

  # Azure does not permit NSGs on PostgreSQL-delegated subnets — any attempt
  # to associate one will be rejected by the Azure API.
  delegation {
    name = "postgresql-delegation"

    service_delegation {
      name = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action",
      ]
    }
  }
}

# ----------------------------------------------------------------------------
# Shared private DNS zone for PostgreSQL Flexible Server.
# The zone name must match the server name — Azure automatically injects the
# server's A record into a zone named "<server>.private.postgres.database.azure.com".
# A custom zone name would not receive the A record and name resolution would fail.
# Per-PR VNets add their own VNet link to this zone (managed in infra/modules/network/).
# ----------------------------------------------------------------------------
resource "azurerm_private_dns_zone" "postgresql" {
  name                = "psql-ludium-pr-infra.private.postgres.database.azure.com"
  resource_group_name = data.azurerm_resource_group.shared.name
  tags                = local.tags

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_private_dns_zone_virtual_network_link" "shared" {
  name                  = "link-postgresql-shared"
  resource_group_name   = data.azurerm_resource_group.shared.name
  private_dns_zone_name = azurerm_private_dns_zone.postgresql.name
  virtual_network_id    = azurerm_virtual_network.main.id
  tags                  = local.tags
}

# ----------------------------------------------------------------------------
# Admin credential — stored in Terraform state only.
# State is locked down to private access only (see infra/CLAUDE.md).
# The admin password is used only by Terraform to provision the server;
# application workloads authenticate via Entra ID managed identity — no password.
# ----------------------------------------------------------------------------
resource "random_password" "postgresql_admin" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# ----------------------------------------------------------------------------
# Shared private DNS zones.
# These zones are referenced by per-PR environments via data sources.
# Each PR environment adds its own VNet link to these zones rather than
# creating duplicate zones in the shared resource group.
# ----------------------------------------------------------------------------
resource "azurerm_private_dns_zone" "keyvault" {
  name                = "privatelink.vaultcore.azure.net"
  resource_group_name = data.azurerm_resource_group.shared.name
  tags                = local.tags

  lifecycle {
    prevent_destroy = true
  }
}

# ----------------------------------------------------------------------------
# PostgreSQL Flexible Server — shared across all PR environments.
# Each PR gets its own database on this server (provisioned by infra/modules/database/).
# Application workloads connect via Entra ID managed identity; the admin password
# is used only by Terraform and is never surfaced to application code.
# ----------------------------------------------------------------------------
resource "azurerm_postgresql_flexible_server" "main" {
  name                          = "psql-ludium-pr-infra"
  resource_group_name           = data.azurerm_resource_group.shared.name
  location                      = var.location
  version                       = var.postgresql_version
  administrator_login           = "ludiumadmin"
  administrator_password        = random_password.postgresql_admin.result
  storage_mb                    = var.postgresql_storage_mb
  sku_name                      = var.postgresql_sku
  public_network_access_enabled = false
  delegated_subnet_id           = azurerm_subnet.postgresql.id
  private_dns_zone_id           = azurerm_private_dns_zone.postgresql.id
  tags                          = local.tags

  authentication {
    active_directory_auth_enabled = true
    password_auth_enabled         = true
    tenant_id                     = data.azurerm_client_config.current.tenant_id
  }

  depends_on = [azurerm_private_dns_zone_virtual_network_link.shared]

  lifecycle {
    prevent_destroy = true
    # The administrator_password is set once — Terraform should not attempt to
    # rotate it on every plan (the value in state is authoritative).
    ignore_changes = [
      administrator_password,
    ]
  }
}

# Set the Entra ID administrator on the PostgreSQL server.
# This allows managed identities granted the Entra ID role to authenticate
# without a password. The object_id here is an admin user/group, not an app identity.
resource "azurerm_postgresql_flexible_server_active_directory_administrator" "main" {
  server_name         = azurerm_postgresql_flexible_server.main.name
  resource_group_name = data.azurerm_resource_group.shared.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  object_id           = var.entra_admin_object_id
  principal_name      = var.entra_admin_principal_name
  principal_type      = "Group"
}
