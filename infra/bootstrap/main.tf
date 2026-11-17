# Remote state storage for infra/. Applied once per subscription, with local state kept here.
# See docs/deployment.md.

terraform {
  required_version = ">= 1.13"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.50"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.7"
    }
  }
}

provider "azurerm" {
  subscription_id     = var.subscription_id
  storage_use_azuread = true
  features {}
}

variable "subscription_id" {
  description = "Azure subscription that holds the state storage."
  type        = string
}

variable "location" {
  description = "Azure region for the state storage."
  type        = string
  default     = "westus3"
}

resource "random_string" "suffix" {
  length  = 6
  lower   = true
  numeric = true
  upper   = false
  special = false
}

resource "azurerm_resource_group" "state" {
  name     = "rg-maxxing-tfstate"
  location = var.location
  tags     = { app = "dao-maxxing", purpose = "terraform-state" }
}

# Entra sign-in only (no shared keys), with versioning and soft delete so a bad write or a
# deleted state file can be recovered.
resource "azurerm_storage_account" "state" {
  name                            = "stmaxxingtf${random_string.suffix.result}"
  location                        = azurerm_resource_group.state.location
  resource_group_name             = azurerm_resource_group.state.name
  account_tier                    = "Standard"
  account_replication_type        = "LRS"
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false
  shared_access_key_enabled       = false
  default_to_oauth_authentication = true
  tags                            = azurerm_resource_group.state.tags

  blob_properties {
    versioning_enabled = true

    delete_retention_policy {
      days = 30
    }

    container_delete_retention_policy {
      days = 30
    }
  }
}

resource "azurerm_storage_container" "state" {
  name                  = "tfstate"
  storage_account_id    = azurerm_storage_account.state.id
  container_access_type = "private"
}

output "resource_group_name" {
  value = azurerm_resource_group.state.name
}

output "storage_account_name" {
  value = azurerm_storage_account.state.name
}

output "storage_account_id" {
  description = "Scope for the Storage Blob Data Contributor grant."
  value       = azurerm_storage_account.state.id
}

output "container_name" {
  value = azurerm_storage_container.state.name
}
