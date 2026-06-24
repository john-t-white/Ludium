resource "azurerm_linux_web_app" "web" {
  name                = "app-ludium-${var.environment}-web"
  location            = var.location
  resource_group_name = var.resource_group_name
  service_plan_id     = var.app_service_plan_id
  https_only          = true
  tags                = var.tags

  identity {
    type = "SystemAssigned"
  }

  site_config {
    always_on        = false
    app_command_line = "node server.js"

    application_stack {
      node_version = "20-lts"
    }
  }

  app_settings = {
    # Injected at provision time; overwritten by the deploy job to the actual API URL.
    "NEXT_PUBLIC_API_URL" = var.api_url

    # Required for zip deployment.
    "WEBSITE_RUN_FROM_PACKAGE" = "1"
  }

  lifecycle {
    # The deploy job updates NEXT_PUBLIC_API_URL and WEBSITE_RUN_FROM_PACKAGE
    # via az webapp config appsettings set after artifact deployment.
    ignore_changes = [
      app_settings["WEBSITE_RUN_FROM_PACKAGE"],
      app_settings["NEXT_PUBLIC_API_URL"],
    ]
  }
}
