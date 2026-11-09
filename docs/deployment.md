# Deployment (D3)

One Azure environment, defined in Terraform under [`infra/`](../infra). The
default region is West US.

| Resource | Purpose |
|---|---|
| Container Apps environment and app | Runs the API, which also serves the Angular app. Scales to zero when idle |
| Azure SQL Database, serverless | App data. Auto-pauses after 60 minutes idle. Entra sign-in only |
| Storage account, private `photos` container | Progress photos (P2). No public blobs, no shared keys |
| Key Vault | Google client ID and secret, owner subject |
| Container Registry (Basic) | Application images |
| Log Analytics workspace | Container and platform logs. 30-day retention, 1 GB/day cap |
| User-assigned managed identity | The app's identity for everything above. No passwords |

**Cost:** the steady costs are the Basic registry (about $5/month) and small
storage amounts. SQL and the app bill mainly while in use. Check the Azure
pricing page before applying, since prices change.

## First deployment

You need Terraform 1.13 or later, the Azure CLI (`az login`), and Docker.
Your account needs Owner, or Contributor plus User Access Administrator, on the
subscription, because Terraform creates role assignments.

1. Configure and initialize:

   ```bash
   cd infra
   cp terraform.tfvars.example terraform.tfvars   # then set subscription_id
   terraform init
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

- **State is local** (`infra/terraform.tfstate`, ignored by git). Keep that
  file safe. It holds no app secrets. D4 #13 moves it to a remote backend so
  CI can use it.
- **New images:** Terraform ignores the image after creation, so an apply won't
  roll back a deployment. D4 #13 automates deployments.
- **Database access:** the app's identity is the SQL server's only admin, so it
  can run its own migrations. To query the database yourself, temporarily set
  your account as the Entra admin, or add a database user for it first.
- **Region errors:** some subscription types can't create Azure SQL in every
  region. If you see `RegionDoesNotAllowProvisioning`, change `location`.
- **Cold starts:** after an idle period, the first request waits for the app
  to start and the database to resume, which can take about a minute.
- **Logs:** Azure portal → Container App → Log stream, or query
  `ContainerAppConsoleLogs_CL` in Log Analytics.
