output "resource_group" {
  value = azurerm_resource_group.main.name
}

output "app_name" {
  value = azurerm_container_app.main.name
}

output "public_origin" {
  value = local.public_origin
}

output "google_redirect_uri" {
  description = "Register this in the Google OAuth client."
  value       = "${local.public_origin}/signin-google"
}

output "registry" {
  value = azurerm_container_registry.main.login_server
}

output "key_vault" {
  value = azurerm_key_vault.main.name
}

output "storage_account" {
  value = azurerm_storage_account.main.name
}
