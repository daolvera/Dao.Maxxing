terraform {
  required_version = ">= 1.13"

  # Remote state in Azure Storage (Entra sign-in). Settings come from backend.hcl; see
  # docs/deployment.md.
  backend "azurerm" {}

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.50"
    }
    azapi = {
      source  = "Azure/azapi"
      version = "~> 2.7"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.7"
    }
    time = {
      source  = "hashicorp/time"
      version = "~> 0.13"
    }
  }
}

provider "azapi" {
  subscription_id = var.subscription_id
}

provider "azurerm" {
  subscription_id = var.subscription_id
  # The storage account has shared keys disabled, so the provider must use Entra ID.
  storage_use_azuread = true
  features {}
}
