output "keyvault_id" {
  description = "Resource ID of the Key Vault"
  value       = azurerm_key_vault.main.id
}

output "keyvault_uri" {
  description = "URI of the Key Vault (used for Key Vault reference app settings)"
  value       = azurerm_key_vault.main.vault_uri
  sensitive   = true
}

output "keyvault_name" {
  description = "Name of the Key Vault"
  value       = azurerm_key_vault.main.name
  sensitive   = true
}
