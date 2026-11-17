# Deployment (D3)

One Azure environment, defined in Terraform under [`infra/`](../infra). The
default region is West US 3.

| Resource | Purpose |
|---|---|
| Container Apps environment and app | Runs the API, which also serves the Angular app. Scales to zero when idle |
| Azure SQL Database, serverless | App data. Auto-pauses after 60 minutes idle. Entra sign-in only |
| Storage account, private `photos` container | Progress photos (P2). No public blobs, no shared keys |
| Key Vault | Google client ID and secret, owner subject, and the `data-protection` key that wraps the session keys stored in SQL |
| Container Registry (Basic) | Application images |
| Log Analytics workspace | Container and platform logs. 30-day retention, 1 GB/day cap |
| User-assigned managed identity | The app's identity for everything above. No passwords |

**Cost** (West US 3 list prices, November 2026; check the pricing page, since
prices change):

| Item | Price | Typical month |
|---|---|---|
| Container Registry Basic | $0.167/day | about $5 |
| Azure SQL serverless (free offer) | 100,000 vCore-seconds and 32 GB free per month | $0 (about 55 awake hours at 0.5 vCore) |
| Container Apps (0.25 vCPU, 0.5 GiB, scales to zero) | about $0.027 per active hour, after a per-subscription free grant | $0–2 |
| Log Analytics | first 5 GB/month free, then $2.30/GB | $0–1 |
| Key Vault, storage | $0.03 per 10,000 operations; $0.02/GB-month | under $1 |

So expect about **$5–8/month**. With the free offer, the database pauses for
the rest of the month once the allowance is used up
(`sql_free_limit_exhaustion_behavior = "AutoPause"`). Set it to
`BillOverUsage` to keep running at about $0.26 per awake hour instead. Without
the free offer (`use_sql_free_offer = false`, or once a subscription's single
free database is taken), SQL pauses after 15 idle minutes and costs about
$5–20/month depending on use.

## First deployment

You need Terraform 1.13 or later, the Azure CLI (`az login`), and Docker.
Your account needs Contributor on the subscription, plus the right to create
the app's role assignments (below).

### Role assignments

Terraform gives the app's identity, and you as the deployer, these roles in
the resource group. Assigning them needs Owner, User Access Administrator, or
Role Based Access Control Administrator, and some organizations restrict which
roles those can assign. If `terraform apply` fails with `AuthorizationFailed`
on `roleAssignments/write`, ask an administrator for **Role Based Access
Control Administrator** on `rg-maxxing-<environment>`, constrained to these
roles:

| Role | ID | Who | Scope |
|---|---|---|---|
| AcrPull | `7f951dda-4ed3-4680-a7ca-43fe172d538d` | app | registry |
| Storage Blob Data Contributor | `ba92f5b4-2d11-453d-a403-e96b0029c9fe` | app | storage account |
| Key Vault Secrets User | `4633458b-17de-408a-b874-0445c86b69e6` | app | Key Vault |
| Key Vault Crypto Service Encryption User | `e147488a-f6f5-4113-8e2d-b22465e65bf6` | app | `data-protection` key |
| Key Vault Secrets Officer | `b86a8fe4-44ce-4948-aee5-eccb2c155cd7` | deployer | Key Vault |
| Key Vault Crypto Officer | `14b46e9e-c2b7-41b4-b07b-48a6ebf60603` | deployer | Key Vault |

Create the resource group and registry first (step 2) so there is a scope to
grant on.

1. Configure and initialize:

   ```bash
   cd infra
   cp terraform.tfvars.example terraform.tfvars   # set subscription_id and environment_name
   cp backend.hcl.example backend.hcl             # see "Remote state" below
   terraform init -backend-config=backend.hcl
   ```

2. Create the registry first, because the app can't start without an image:

   ```bash
   terraform apply -target=azurerm_container_registry.main
   ```

3. Build and push the image from the repository root. `<registry>` is the
   registry's login server, shown by `terraform output -raw registry` after
   step 2 or in the portal:

   ```bash
   az acr login --name <registry>
   npm ci --prefix Dao.Maxxing.Web && npm run build --prefix Dao.Maxxing.Web
   cp -r Dao.Maxxing.Web/dist/. Dao.Maxxing.Api/wwwroot/
   dotnet publish Dao.Maxxing.Api -c Release -t:PublishContainer -p:ContainerRegistry=<registry> -p:ContainerRepository=dao-maxxing-api -p:ContainerImageTag=initial
   ```

4. Review and apply everything else:

   ```bash
   cd infra
   terraform plan -out=tfplan
   terraform apply tfplan
   ```

5. Set the real secrets. Terraform creates them with a placeholder and never
   stores the real values, so they stay out of its state:

   ```bash
   az keyvault secret set --vault-name <key_vault> --name google-client-id --value "<client-id>"
   az keyvault secret set --vault-name <key_vault> --name google-client-secret --value "<client-secret>"
   az keyvault secret set --vault-name <key_vault> --name owner-google-subject --value "<your-sub>"
   ```

6. In the Google OAuth client, add the redirect URI from
   `terraform output google_redirect_uri`.

7. Restart so the app picks up the secrets:

   ```bash
   az containerapp revision restart --resource-group <resource_group> --name <app_name> --revision "$(az containerapp revision list --resource-group <resource_group> --name <app_name> --query '[0].name' -o tsv)"
   ```

8. Open the `public_origin` output and sign in. Migrations run at startup, and
   `/health` reports whether they applied.

## Good to know

- **Environments:** `environment_name` names the resource group
  (`rg-maxxing-<name>`) and resources. `terraform.tfvars` is ignored by git,
  so which subscription an environment lives in never appears in the
  repository.
- **Session keys:** the keys that encrypt session and antiforgery cookies live
  in the `DataProtectionKeys` table, wrapped with the Key Vault key
  `data-protection`. The app may only wrap and unwrap with that key. Outside
  Development and Testing, the API refuses to start without
  `DataProtection:KeyVaultKeyId`, which Terraform sets.

- **Remote state:** Terraform state lives in Azure Storage, one blob per
  environment (`maxxing-<environment>.tfstate`). It's created once per
  subscription by `infra/bootstrap` (its own small local state, ignored by
  git):

  ```bash
  cd infra/bootstrap
  echo 'subscription_id = "<id>"' > terraform.tfvars
  terraform init && terraform apply
  terraform output
  ```

  The account has shared keys disabled, versioning on, and 30-day soft
  delete. Terraform signs in with your Entra login, so anyone running it needs
  **Storage Blob Data Contributor** on that storage account (the
  `storage_account_id` output). D4 #13's CI identity needs the same. Copy the
  outputs into `infra/backend.hcl` (ignored by git, so the subscription stays
  out of the repository). To move an existing local state:
  `terraform init -migrate-state -backend-config=backend.hcl`. The state holds
  no app secrets.
- **New images:** Terraform ignores the image after creation, so an apply won't
  roll back a deployment. D4 #13 automates deployments.
- **Database access:** the app's identity is the SQL server's only admin, so it
  can run its own migrations. To query the database yourself, temporarily set
  your account as the Entra admin, or add a database user for it first.
- **Region errors:** some subscription types can't create Azure SQL in every
  region. If you see `ProvisioningDisabled` or `RegionDoesNotAllowProvisioning`,
  change `location`. To check a region first:
  `az rest --method get --url "https://management.azure.com/subscriptions/<id>/providers/Microsoft.Sql/locations/<region>/capabilities?api-version=2021-11-01" --query status`
  (`Available` works; `Visible` doesn't).
- **Cold starts:** after an idle period, the first request waits for the app
  to start and the database to resume, which can take about a minute.
- **Logs:** Azure portal → Container App → Log stream, or query
  `ContainerAppConsoleLogs_CL` in Log Analytics.
