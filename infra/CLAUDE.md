# infra/

Terraform configuration for provisioning Azure infrastructure. All environments — PR and production — are provisioned via Terraform and deployed through GitHub Actions.

## Structure

```
infra/
├── main.tf           # root module — wires together child modules
├── variables.tf      # input variables (environment identifier, SKU sizes, etc.)
├── outputs.tf        # outputs consumed by GitHub Actions (URLs, resource names)
└── modules/
    ├── api/          # App Service, managed identity, Key Vault references
    ├── database/     # Azure PostgreSQL Flexible Server, PgBouncer config
    ├── network/      # VNet, subnets, private endpoints
    └── web/          # Static Web App or App Service for Next.js frontend
```

## Environments

Each PR gets its own isolated Azure environment, provisioned when the PR opens and torn down when it is merged or closed. Production is a separate long-lived environment updated on every merge to `main`.

Terraform is called with an `environment` variable to fully isolate PR environments from each other and from production. All resource names are namespaced by environment identifier.

## Key Variables

| Variable | Description |
|---|---|
| `environment` | Environment identifier — PR number (e.g. `pr-42`) or `production` |
| `location` | Azure region |
| `api_sku` | App Service plan SKU |
| `db_sku` | PostgreSQL Flexible Server SKU |

## Azure Resources

### Identity

GitHub Actions authenticates to Azure using OIDC federated identity — there are no long-lived passwords or client secrets to rotate.

| Resource | Name |
|---|---|
| App Registration | `app-ludium-github-actions` |
| Federated credential (PRs) | `ludium-github-pr` |
| Federated credential (production) | `ludium-github-main` |

### Resource Groups

| Resource Group | Purpose |
|---|---|
| `rg-ludium-pr-infra` | Shared infrastructure — Terraform state storage |
| `rg-ludium-pr` | All PR environment resources |
| `rg-ludium-production` | Production environment resources |

The `app-ludium-github-actions` service principal has **Contributor** on `rg-ludium-pr-infra` and `rg-ludium-pr` only. Production access is granted separately.

### Region

All resources are provisioned in **East US 2**.

## State Backend

Terraform state is stored in Azure Blob Storage in `rg-ludium-pr-infra`. State is namespaced per environment — each PR environment has its own state file. Never manually edit or delete state files.

| Resource | Name |
|---|---|
| Storage account | `stludiumtfstate` |
| Container | `tfstate` |

**Security requirement:** `stludiumtfstate` must have `AllowBlobPublicAccess: false` and network access restricted to GitHub Actions (or managed identity) only. Terraform state files can contain sensitive resource data — public access must never be enabled on this account.

State file naming convention:

| Environment | State file key |
|---|---|
| PR #48 | `pr-48.tfstate` |
| PR #51 | `pr-51.tfstate` |
| Production | `production.tfstate` |

## GitHub Secrets and Variables

These are configured in **Repository → Settings → Secrets and variables → Actions**.

Secrets (sensitive — stored as repository secrets):

| Secret | Value |
|---|---|
| `AZURE_CLIENT_ID` | `app-ludium-github-actions` Application (client) ID |
| `AZURE_TENANT_ID` | Entra ID Directory (tenant) ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |

Variables (not sensitive — stored as repository variables):

| Variable | Value |
|---|---|
| `AZURE_TF_STATE_STORAGE_ACCOUNT` | `stludiumtfstate` |
| `AZURE_TF_STATE_CONTAINER` | `tfstate` |
| `AZURE_PR_RESOURCE_GROUP` | `rg-ludium-pr` |
| `AZURE_PR_SHARED_RESOURCE_GROUP` | `rg-ludium-pr-infra` |
| `AZURE_PRODUCTION_RESOURCE_GROUP` | `rg-ludium-production` |
| `AZURE_PR_POSTGRESQL_SERVER_NAME` | `psql-ludium-pr-infra` |
| `AZURE_PR_POSTGRESQL_SERVER_FQDN` | `psql-ludium-pr-infra.postgres.database.azure.com` |

## GitHub Actions Workflows

| Workflow | Trigger | Action |
|---|---|---|
| PR deploy | PR opened / updated | Provision PR environment, deploy, run all tests |
| PR teardown | PR merged / closed | Destroy PR environment and all Azure resources |
| PR environment cleanup | Daily schedule | Audit for orphaned PR environments with no open PR and destroy them |
| Production deploy | Push to `main` | Deploy to production environment |

## PostgreSQL

- Azure Flexible Server enforces SSL — connection strings in Key Vault must include `Ssl Mode=Require`
- Azure Flexible Server has hard connection limits per SKU tier — configure PgBouncer or Azure's built-in connection pooling
- The PostgreSQL version configured in Terraform must be kept in sync with the version pinned in `docker-compose.yml`

## Secrets

- All secrets (connection strings, API keys) are stored in Azure Key Vault, provisioned per environment
- The API accesses Key Vault via managed identity — no credentials in application config
- Never put secret values in Terraform variables or state — use Key Vault references

## Rules

- Never modify infrastructure files without explicitly confirming with the user first
- Never run `terraform destroy` on the production environment manually — only GitHub Actions should do this
- Always run `terraform plan` and review the output before applying any changes
- Resource naming must include the environment identifier to prevent cross-environment collisions
