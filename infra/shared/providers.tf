terraform {
  required_version = ">=1.9"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~>4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~>3.6"
    }
  }
}

provider "azurerm" {
  # The service principal has Contributor on specific resource groups only,
  # not subscription-level permissions to register resource providers.
  # The required providers (Network, KeyVault, DBforPostgreSQL, Web, ManagedIdentity)
  # must be registered once in the Azure portal or via az cli before first apply.
  resource_provider_registrations = "none"

  features {
    key_vault {
      purge_soft_delete_on_destroy    = false
      recover_soft_deleted_key_vaults = true
    }
  }
}
