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

## State Backend

Terraform state is stored in Azure Blob Storage. State is namespaced per environment — each PR environment has its own state file. Never manually edit or delete state files.

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
