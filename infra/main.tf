# One Azure environment for Dao.Maxxing. See docs/deployment.md.

data "azurerm_client_config" "current" {}

resource "random_string" "suffix" {
  length  = 6
  lower   = true
  numeric = true
  upper   = false
  special = false
}

locals {
  name          = "maxxing-${var.environment_name}"
  flat_name     = "maxxing${var.environment_name}${random_string.suffix.result}"
  app_name      = "ca-${local.name}"
  public_origin = var.public_origin != "" ? var.public_origin : "https://${local.app_name}.${azurerm_container_app_environment.main.default_domain}"
  tags          = { app = "dao-maxxing", environment = var.environment_name }

  # Secret values never go through Terraform, so they stay out of its state. These are created with
  # a placeholder, then set with the Azure CLI (docs/deployment.md).
  app_secrets = {
    google-client-id     = "Authentication__Google__ClientId"
    google-client-secret = "Authentication__Google__ClientSecret"
    owner-google-subject = "Authentication__Owner__GoogleSubject"
  }
}

resource "azurerm_resource_group" "main" {
  name     = "rg-${local.name}"
  location = var.location
  tags     = local.tags
}

# The app's identity for the database, Key Vault, storage, and registry. No passwords or keys.
resource "azurerm_user_assigned_identity" "app" {
  name                = "id-${local.name}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  tags                = local.tags
}

# Diagnostics: container console output (JSON in production) and platform logs.
resource "azurerm_log_analytics_workspace" "main" {
  name                = "log-${local.name}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  daily_quota_gb      = 1
  tags                = local.tags
}

resource "azurerm_container_registry" "main" {
  name                = substr("acr${local.flat_name}", 0, 50)
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "Basic"
  admin_enabled       = false
  tags                = local.tags
}

resource "azurerm_role_assignment" "app_acr_pull" {
  scope                = azurerm_container_registry.main.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
  principal_type       = "ServicePrincipal"
}

# Azure SQL: Entra-only sign-in, with the app's identity as server admin. That lets the app run its
# own migrations without a password or a manual CREATE USER step.
resource "azurerm_mssql_server" "main" {
  name                = "sql-${local.name}-${random_string.suffix.result}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  version             = "12.0"
  minimum_tls_version = "1.2"
  tags                = local.tags

  azuread_administrator {
    login_username              = azurerm_user_assigned_identity.app.name
    object_id                   = azurerm_user_assigned_identity.app.principal_id
    tenant_id                   = data.azurerm_client_config.current.tenant_id
    azuread_authentication_only = true
  }
}

# Without a virtual network, this is how Container Apps reach the server. Sign-in stays Entra-only.
resource "azurerm_mssql_firewall_rule" "azure_services" {
  name             = "AllowAzureServices"
  server_id        = azurerm_mssql_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# Serverless with auto-pause: a paused database bills only for storage (docs/database.md).
resource "azurerm_mssql_database" "main" {
  name                        = "maxxing"
  server_id                   = azurerm_mssql_server.main.id
  sku_name                    = "GP_S_Gen5_1"
  min_capacity                = 0.5
  auto_pause_delay_in_minutes = 60
  max_size_gb                 = 5
  storage_account_type        = "Local"
  tags                        = local.tags
}

# Private storage for progress photos (P2). No public blobs and no shared keys.
resource "azurerm_storage_account" "main" {
  name                            = substr("st${local.flat_name}", 0, 24)
  location                        = azurerm_resource_group.main.location
  resource_group_name             = azurerm_resource_group.main.name
  account_tier                    = "Standard"
  account_replication_type        = "LRS"
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false
  shared_access_key_enabled       = false
  tags                            = local.tags
}

resource "azurerm_storage_container" "photos" {
  name                  = "photos"
  storage_account_id    = azurerm_storage_account.main.id
  container_access_type = "private"
}

resource "azurerm_role_assignment" "app_blob_data" {
  scope                = azurerm_storage_account.main.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
  principal_type       = "ServicePrincipal"
}

resource "azurerm_key_vault" "main" {
  name                       = substr("kv${local.flat_name}", 0, 24)
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  rbac_authorization_enabled = true
  soft_delete_retention_days = 7
  tags                       = local.tags
}

resource "azurerm_role_assignment" "deployer_secrets" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = data.azurerm_client_config.current.object_id
}

resource "azurerm_role_assignment" "app_secrets" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
  principal_type       = "ServicePrincipal"
}

# New role assignments can take a minute to apply.
resource "time_sleep" "role_propagation" {
  create_duration = "90s"
  depends_on = [
    azurerm_role_assignment.deployer_secrets,
    azurerm_role_assignment.app_secrets,
    azurerm_role_assignment.app_acr_pull,
  ]
}

resource "azurerm_key_vault_secret" "app" {
  for_each     = local.app_secrets
  name         = each.key
  key_vault_id = azurerm_key_vault.main.id
  value        = "set-with-azure-cli"
  depends_on   = [time_sleep.role_propagation]

  lifecycle {
    ignore_changes = [value]
  }
}

resource "azurerm_container_app_environment" "main" {
  name                       = "cae-${local.name}"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  tags                       = local.tags
}

resource "azurerm_container_app" "main" {
  name                         = local.app_name
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"
  tags                         = local.tags

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.app.id]
  }

  registry {
    server   = azurerm_container_registry.main.login_server
    identity = azurerm_user_assigned_identity.app.id
  }

  dynamic "secret" {
    for_each = local.app_secrets
    content {
      name                = secret.key
      identity            = azurerm_user_assigned_identity.app.id
      key_vault_secret_id = azurerm_key_vault_secret.app[secret.key].versionless_id
    }
  }

  ingress {
    external_enabled = true
    target_port      = 8080
    transport        = "auto"

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    # Scales to zero when idle, so the first request after a quiet period takes longer.
    min_replicas = 0
    max_replicas = 1

    container {
      name   = "api"
      image  = "${azurerm_container_registry.main.login_server}/dao-maxxing-api:${var.image_tag}"
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name  = "ASPNETCORE_ENVIRONMENT"
        value = "Production"
      }
      # The ingress is the only way in, so its X-Forwarded-Proto can be trusted. Without this the
      # app sees HTTP and builds the wrong Google redirect URI.
      env {
        name  = "ASPNETCORE_FORWARDEDHEADERS_ENABLED"
        value = "true"
      }
      env {
        name  = "AZURE_CLIENT_ID"
        value = azurerm_user_assigned_identity.app.client_id
      }
      env {
        name  = "ConnectionStrings__maxxing"
        value = "Server=tcp:${azurerm_mssql_server.main.fully_qualified_domain_name},1433;Database=${azurerm_mssql_database.main.name};Authentication=Active Directory Managed Identity;User Id=${azurerm_user_assigned_identity.app.client_id};Encrypt=True;Connect Timeout=60"
      }
      env {
        name  = "Authentication__PublicOrigin"
        value = local.public_origin
      }

      dynamic "env" {
        for_each = local.app_secrets
        content {
          name        = env.value
          secret_name = env.key
        }
      }

      # Generous: migrations run before the app listens, and a paused database takes time to resume.
      startup_probe {
        transport               = "HTTP"
        port                    = 8080
        path                    = "/alive"
        interval_seconds        = 10
        failure_count_threshold = 30
      }
      liveness_probe {
        transport = "HTTP"
        port      = 8080
        path      = "/alive"
      }
      readiness_probe {
        transport = "HTTP"
        port      = 8080
        path      = "/health"
      }
    }
  }

  depends_on = [time_sleep.role_propagation]

  lifecycle {
    # D4 deploys new images outside Terraform; don't roll them back on the next apply.
    ignore_changes = [template[0].container[0].image]
  }
}
