data "azurerm_client_config" "current" {}

locals {
  postgresql_server_resource_id = "/subscriptions/${data.azurerm_client_config.current.subscription_id}/resourceGroups/${var.postgresql_server_resource_group}/providers/Microsoft.DBforPostgreSQL/flexibleServers/${var.postgresql_server_name}"
}

resource "azurerm_service_plan" "main" {
  name                = "asp-ludium-${var.environment}"
  location            = var.location
  resource_group_name = var.resource_group_name
  os_type             = "Linux"
  sku_name            = var.api_sku
  tags                = var.tags
}

resource "azurerm_linux_web_app" "api" {
  name                      = "app-ludium-${var.environment}-api"
  location                  = var.location
  resource_group_name       = var.resource_group_name
  service_plan_id           = azurerm_service_plan.main.id
  virtual_network_subnet_id = var.subnet_id
  https_only                = true
  tags                      = var.tags

  identity {
    type = "SystemAssigned"
  }

  site_config {
    always_on        = false
    app_command_line = ""

    application_stack {
      dotnet_version = "10.0"
    }
  }

  app_settings = {
    # Managed identity PostgreSQL connection — no password.
    # The API uses the managed identity to acquire an Entra ID access token
    # and presents it to PostgreSQL as the password. No credential stored here.
    "PGHOST"     = var.postgresql_server_fqdn
    "PGDATABASE" = var.database_name
    "PGSSLMODE"  = "require"

    # Key Vault URI so the API can reference secrets via the SDK.
    "KEYVAULT_URI" = var.keyvault_uri

    # Required for zip deployment — set to 1 at provision time; the deploy
    # job overwrites this with the blob URL. Ignored on subsequent plans.
    "WEBSITE_RUN_FROM_PACKAGE" = "1"
  }

  lifecycle {
    # The deploy job overwrites WEBSITE_RUN_FROM_PACKAGE with the artifact blob URL.
    # Ignoring prevents Terraform from reverting it on the next plan.
    ignore_changes = [
      app_settings["WEBSITE_RUN_FROM_PACKAGE"],
    ]
  }
}

# Grant the API managed identity the Key Vault Secrets User role on the per-env Key Vault.
# This allows the API to read secrets using its managed identity — no credential required.
resource "azurerm_role_assignment" "api_keyvault_secrets_user" {
  scope                = var.keyvault_id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_linux_web_app.api.identity[0].principal_id
}

# Grant the API managed identity read access to the shared PostgreSQL Flexible Server.
# The "Reader" role is sufficient for Entra ID token-based authentication — the managed
# identity authenticates as a PostgreSQL Entra ID user, not as an admin.
resource "azurerm_role_assignment" "api_postgresql_reader" {
  scope                = local.postgresql_server_resource_id
  role_definition_name = "Reader"
  principal_id         = azurerm_linux_web_app.api.identity[0].principal_id
}
