locals {
  api_subnet_prefix = cidrsubnet(var.vnet_cidr, 8, 1)
  pe_subnet_prefix  = cidrsubnet(var.vnet_cidr, 8, 3)
}

resource "azurerm_virtual_network" "main" {
  name                = "vnet-ludium-${var.environment}"
  location            = var.location
  resource_group_name = var.resource_group_name
  address_space       = [var.vnet_cidr]
  tags                = var.tags
}

resource "azurerm_subnet" "api" {
  name                 = "snet-ludium-${var.environment}-api"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [local.api_subnet_prefix]

  delegation {
    name = "app-service-delegation"

    service_delegation {
      name = "Microsoft.Web/serverFarms"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/action",
      ]
    }
  }
}

resource "azurerm_subnet" "private_endpoints" {
  name                 = "snet-ludium-${var.environment}-pe"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [local.pe_subnet_prefix]
}

resource "azurerm_network_security_group" "api" {
  name                = "nsg-ludium-${var.environment}-api"
  location            = var.location
  resource_group_name = var.resource_group_name
  tags                = var.tags

  security_rule {
    name                       = "allow-https-inbound"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "deny-all-inbound"
    priority                   = 4096
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

resource "azurerm_network_security_group" "private_endpoints" {
  name                = "nsg-ludium-${var.environment}-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  tags                = var.tags
}

resource "azurerm_subnet_network_security_group_association" "api" {
  subnet_id                 = azurerm_subnet.api.id
  network_security_group_id = azurerm_network_security_group.api.id
}

resource "azurerm_subnet_network_security_group_association" "private_endpoints" {
  subnet_id                 = azurerm_subnet.private_endpoints.id
  network_security_group_id = azurerm_network_security_group.private_endpoints.id
}

# ----------------------------------------------------------------------------
# VNet peering — PR VNet <-> shared VNet.
# Both directions are required for peered connectivity to function.
# The shared_to_pr peer is created in rg-ludium-pr-infra; the service principal
# has Contributor on that resource group so this is permitted.
# ----------------------------------------------------------------------------
resource "azurerm_virtual_network_peering" "pr_to_shared" {
  name                         = "peer-${var.environment}-to-shared"
  resource_group_name          = var.resource_group_name
  virtual_network_name         = azurerm_virtual_network.main.name
  remote_virtual_network_id    = var.shared_vnet_id
  allow_virtual_network_access = true
  # allow_forwarded_traffic lets the shared VNet accept traffic forwarded from
  # the App Service through this VNet (required for VNet integration to work).
  # Transitive routing between PR VNets is NOT enabled — Azure does not route
  # traffic between peered VNets by default without an NVA or custom UDR.
  allow_forwarded_traffic = true
}

resource "azurerm_virtual_network_peering" "shared_to_pr" {
  name                         = "peer-shared-to-${var.environment}"
  resource_group_name          = var.shared_resource_group_name
  virtual_network_name         = var.shared_vnet_name
  remote_virtual_network_id    = azurerm_virtual_network.main.id
  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
}

# ----------------------------------------------------------------------------
# PostgreSQL private DNS zone VNet link.
# Links the shared DNS zone (ludium.postgres.database.azure.com) to this PR's
# VNet so that the API can resolve the PostgreSQL FQDN via private DNS.
# The link is created in rg-ludium-pr-infra alongside the DNS zone itself.
# ----------------------------------------------------------------------------
resource "azurerm_private_dns_zone_virtual_network_link" "postgresql_pr" {
  name                  = "link-postgresql-${var.environment}"
  resource_group_name   = var.shared_resource_group_name
  private_dns_zone_name = var.postgresql_private_dns_zone_name
  virtual_network_id    = azurerm_virtual_network.main.id
  tags                  = var.tags
}
