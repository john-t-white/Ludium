# PR Environments

Every pull request automatically gets a dedicated, fully-isolated Azure environment. When you open a PR, the environment is provisioned and the application is deployed. When you push a new commit, the environment is updated. When the PR is merged or closed, everything is torn down.

This document explains how it works, what it needs to run, and how to diagnose problems when something goes wrong.

---

## How It Works

### On PR open or push

The `pr-deploy.yml` workflow runs. At a high level:

```
lint-typecheck ──────────────────────────────────────────────────────┐
build-api ───────────────────────────────────────────────────────────┤
test-unit-api ───────────────────────────────────────────────────────┤──► deploy ──► e2e ──► summary
test-unit-web ───────────────────────────────────────────────────────┤
provision ───────────────────────────────────────────────────────────┘
    │
    └──► build-web (needs API URL to bake NEXT_PUBLIC_API_URL into the JS bundle)
```

The fast, Azure-free jobs (`lint-typecheck`, `build-api`, `test-unit-*`) and `provision` all run in parallel. `build-web` waits only for `provision` (to get the API URL). `deploy` waits for everything. `e2e` waits for `deploy`.

#### What each job does

| Job | What it does |
|---|---|
| `lint-typecheck` | Runs `tsc --noEmit` and `eslint` against `src/web/`. Fast fail — no Azure required. |
| `build-api` | `dotnet build src/api --configuration Release`. Uploads the output as a workflow artifact. |
| `build-web` | `npm run build` with `NEXT_PUBLIC_API_URL` set to the provisioned API URL (baked into the JS bundle at build time). Uploads the Next.js standalone output as an artifact. |
| `test-unit-api` | Runs `dotnet test src/api.tests` if the test project exists; silently skips if not. |
| `test-unit-web` | Runs `npm run test:unit`. Currently a no-op stub; wired up for when a test framework is added. |
| `provision` | Runs `terraform apply` to create (or update) the PR's Azure environment. Outputs the API and web URLs. Also drops and recreates the PR database so E2E tests always start with a clean schema. |
| `deploy` | Downloads the build artifacts and deploys them to the provisioned App Services via `az webapp deploy`. Sets `NEXT_PUBLIC_API_URL` as an app setting on the web App Service. |
| `e2e` | Installs Playwright (chromium only), runs E2E tests against the deployed web URL, uploads the HTML report as a workflow artifact, and publishes a GitHub Check (pass/fail visible inline on the PR). |
| `summary` | Writes the environment URLs to the GitHub job summary so reviewers can open the running app directly from the PR. |

### On PR close or merge

`pr-teardown.yml` triggers and runs `terraform destroy` against the PR's state file. All Azure resources for that environment are removed.

### Daily cleanup

`pr-cleanup.yml` runs on a schedule at 06:00 UTC. It lists all `pr-*.tfstate` blobs in the Terraform state container and checks whether each PR is still open. Any environment whose PR is closed or merged but whose resources were not cleanly torn down (e.g. teardown failed) is destroyed.

---

## Environments Are Isolated

Each PR environment is completely independent:

- **Separate Azure resources** — App Services, database, Key Vault, and VNet are all namespaced to the PR number (e.g. `app-ludium-pr-42-api`)
- **Separate Terraform state** — stored as `pr-42.tfstate` in the shared state container; one environment's state cannot affect another's
- **Separate VNet** — each PR gets `10.{PR_NUMBER}.0.0/16`; peers to the shared VNet to reach the database but cannot route to other PR VNets (Azure does not enable transitive peering by default)
- **Separate database** — each PR gets its own PostgreSQL database on the shared Flexible Server (`ludium_pr_42`); no data is shared between PRs

---

## Networking

The network topology is the same for PR environments and production:

```
┌─────────────────────────────┐       ┌──────────────────────────────────────┐
│   vnet-ludium-pr-42         │       │   vnet-ludium-shared (172.16.0.0/16) │
│   10.42.0.0/16              │       │                                      │
│                             │       │  ┌─────────────────────────────────┐ │
│  ┌───────────────────────┐  │◄─────►│  │ snet-postgresql (172.16.1.0/24) │ │
│  │ snet-api (10.42.1.0)  │  │ peer  │  │ psql-ludium-shared              │ │
│  │ App Service (API+Web) │  │       │  └─────────────────────────────────┘ │
│  └───────────────────────┘  │       └──────────────────────────────────────┘
│                             │
│  ┌───────────────────────┐  │
│  │ snet-pe (10.42.3.0)   │  │
│  │ Key Vault endpoint    │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

- The API connects to PostgreSQL via VNet peering — no public network access on the database
- The API reads secrets from its per-PR Key Vault via a private endpoint
- The API authenticates to PostgreSQL using its managed identity (Entra ID) — no password in config
- DNS for `psql-ludium-shared.private.postgres.database.azure.com` resolves privately across the peering via a shared DNS zone VNet link

---

## Clean Database on Every Run

Each time the workflow runs (including on push to an existing PR), `terraform apply -replace` is used to drop and recreate the PR's database. This ensures E2E tests always start with an empty schema regardless of what a previous run wrote.

As the application grows and gains a proper seed/reset mechanism, this Terraform-level replacement can be swapped for an application-level reset endpoint — which would be faster and not require a Terraform cycle.

---

## Concurrent Pushes

If you push two commits in quick succession, only the workflow for the latest commit runs. A `concurrency` group keyed to the PR number cancels any in-flight workflow when a new push arrives, preventing simultaneous Terraform state lock conflicts.

---

## Prerequisites — One-Time Setup

The following must exist before the first PR workflow can succeed. These are provisioned once and never torn down.

### Azure resource providers

The following resource providers must be registered in the Azure subscription before Terraform can create any resources. For an active Azure account these are usually already registered, but worth confirming before the first apply.

**To check and register in the portal:**

1. Go to [portal.azure.com](https://portal.azure.com)
2. Search for **Subscriptions** and open your subscription
3. In the left menu, click **Resource providers**
4. Search for each provider below and check the **Status** column
5. If any show **NotRegistered**, click the row and click **Register** at the top — registration completes in 30–60 seconds

| Provider | Used for |
|---|---|
| `Microsoft.Network` | VNet, subnets, VNet peering, private endpoints |
| `Microsoft.KeyVault` | Key Vault (per-PR vaults) |
| `Microsoft.DBforPostgreSQL` | PostgreSQL Flexible Server |
| `Microsoft.Web` | App Service plan and App Services |
| `Microsoft.ManagedIdentity` | System-assigned managed identities on App Services |

### Azure resources (provisioned by `infra/shared/`)

Run this once from a machine with Azure credentials:

```bash
cd infra/shared
terraform init \
  -backend-config="storage_account_name=stludiumtfstate" \
  -backend-config="container_name=tfstate" \
  -backend-config="key=shared.tfstate" \
  -backend-config="resource_group_name=rg-ludium-shared" \
  -backend-config="use_oidc=true"

terraform apply \
  -var="entra_admin_object_id=<object-id-of-entra-admin-group>" \
  -var="entra_admin_principal_name=<upn-or-display-name>"
```

This provisions:
- `vnet-ludium-shared` — the shared VNet that all PR VNets peer to
- `psql-ludium-shared` — the PostgreSQL Flexible Server (one per project, shared across all PR environments)
- `psql-ludium-shared.private.postgres.database.azure.com` — the private DNS zone for PostgreSQL

After applying, note the outputs and set these GitHub repository variables:

| Variable | Value |
|---|---|
| `AZURE_POSTGRESQL_SERVER_NAME` | `psql-ludium-shared` |
| `AZURE_POSTGRESQL_SERVER_FQDN` | value from `terraform output server_fqdn` |

### GitHub repository secrets and variables

These must be configured under **Repository → Settings → Secrets and variables → Actions** before the workflow can authenticate to Azure.

**Secrets:**

| Secret | Description |
|---|---|
| `AZURE_CLIENT_ID` | Application (client) ID of `app-ludium-github-actions` |
| `AZURE_TENANT_ID` | Entra ID Directory (tenant) ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |

**Variables:**

| Variable | Value |
|---|---|
| `AZURE_TF_STATE_STORAGE_ACCOUNT` | `stludiumtfstate` |
| `AZURE_TF_STATE_CONTAINER` | `tfstate` |
| `AZURE_PR_RESOURCE_GROUP` | `rg-ludium-pr` |
| `AZURE_SHARED_RESOURCE_GROUP` | `rg-ludium-shared` |
| `AZURE_POSTGRESQL_SERVER_NAME` | `psql-ludium-shared` |
| `AZURE_POSTGRESQL_SERVER_FQDN` | `psql-ludium-shared.private.postgres.database.azure.com` |

---

## Diagnosing Failures

### Provision failed — resource provider not registered

**Symptom:** Terraform plan fails with a large block of 403 errors mentioning `register/action` and `AuthorizationFailed`.

**Cause:** One or more Azure resource providers are not registered in the subscription. This is a one-time setup step — see the prerequisites section above.

**Fix:** Register the missing providers in the Azure Portal (Subscription → Resource providers) or via Cloud Shell:

```bash
az provider register --namespace Microsoft.Network
az provider register --namespace Microsoft.KeyVault
az provider register --namespace Microsoft.DBforPostgreSQL
az provider register --namespace Microsoft.Web
az provider register --namespace Microsoft.ManagedIdentity
```

Wait 30–60 seconds for each to complete, then re-run the workflow.

### Provision failed — Terraform state lock

**Symptom:** `terraform init` or `terraform apply` fails with "state blob is already locked".

**Cause:** A previous workflow run did not release the lock — most likely it was cancelled mid-apply.

**Fix:** Find the lock in the Azure Portal (Storage account → `tfstate` container → `pr-{N}.tfstate.lock`) and delete it manually, then re-run the workflow.

### Provision failed — OIDC token error

**Symptom:** `azure/login` step fails with an authentication or token exchange error.

**Cause:** The federated credential subject claim doesn't match. The `ludium-github-pr` credential is scoped to `pull_request` events on the `john-t-white/Ludium` repository.

**Fix:** Verify the federated credential in Azure Entra ID matches the repository name and event type. Confirm `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, and `AZURE_SUBSCRIPTION_ID` are set correctly in GitHub secrets.

### Provision failed — shared resources not found

**Symptom:** Terraform fails with "Resource not found" for `vnet-ludium-shared`, `psql-ludium-shared`, or `psql-ludium-shared.private.postgres.database.azure.com`.

**Cause:** The one-time shared infrastructure has not been applied yet, or was applied to the wrong resource group.

**Fix:** Run `terraform apply` in `infra/shared/` as described in the prerequisites section above.

### Deploy failed — App Service deployment error

**Symptom:** `az webapp deploy` step fails.

**Cause:** Common causes are the App Service not yet fully started after Terraform provisioning, or the artifact zip being malformed.

**Fix:** Re-run the workflow. If it fails consistently, check the App Service logs in the Azure Portal (App Service → Log stream).

### E2E tests failed

**Symptom:** Playwright tests fail; the HTML report artifact shows which tests and what errors.

**Fix:** Download the `playwright-report-pr-{N}` artifact from the workflow run and open `index.html` in a browser. The report includes screenshots, traces, and error details for every failed test. The GitHub Check on the PR also shows a summary inline.

### Teardown failed — environment not cleaned up

**Symptom:** PR is closed but Azure resources are still running.

**Fix:** The daily cleanup workflow (`pr-cleanup.yml`) will catch this at 06:00 UTC and destroy the environment automatically. To destroy immediately, trigger `pr-cleanup.yml` manually via **Actions → PR Environment Cleanup → Run workflow**.

---

## Security Notes

- The workflow uses OIDC federated identity — no long-lived Azure credentials are stored in GitHub secrets
- `id-token: write` permission is granted only to jobs that call Azure (`provision`, `deploy`, `teardown`, `cleanup`), not at the workflow level
- Azure secrets (`AZURE_CLIENT_ID` etc.) are scoped to job-level `env` blocks, not the workflow level
- The Terraform state key is always derived from `github.event.pull_request.number` — never from PR title, body, or branch name (which are attacker-controlled)
- All third-party GitHub Actions are pinned to commit SHAs, not mutable version tags
- The workflow uses `pull_request` trigger only — `pull_request_target` is never used, which prevents PR branch code from accessing repository secrets
