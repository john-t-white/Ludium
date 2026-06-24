data "azurerm_client_config" "current" {}

locals {
  # Database names must be lowercase, alphanumeric with underscores.
  # Convert "pr-42" -> "pr_42", "production" -> "production".
  database_name         = "ludium_${replace(var.environment, "-", "_")}"
  postgresql_server_id  = "/subscriptions/${data.azurerm_client_config.current.subscription_id}/resourceGroups/${var.postgresql_resource_group}/providers/Microsoft.DBforPostgreSQL/flexibleServers/${var.postgresql_server_name}"
}

resource "azurerm_postgresql_flexible_server_database" "main" {
  name      = local.database_name
  server_id = local.postgresql_server_id
  collation = "en_US.utf8"
  charset   = "UTF8"
}
