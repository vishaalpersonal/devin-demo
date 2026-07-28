# Deploying the Ops Console

CI/CD lives in `.github/workflows/deploy.yml`. The deploy job is **disabled by
default** (`vars.DEPLOY_ENABLED == 'true'` gate) because no cloud credentials
exist yet. When enabling it, follow the least-privilege setup below.

## Principles

- **No long-lived keys.** GitHub Actions authenticates via OIDC federation
  (`permissions: id-token: write`). Never store cloud access keys as repo
  secrets.
- **Secrets live in the cloud secret manager** (Secrets Manager / Key Vault /
  Secret Manager), not in GitHub. The app receives `DATABASE_URL` (the
  restricted `app_user` role) as a secret reference at runtime.
- **Migrations are a separate job**, run with `MIGRATE_DATABASE_URL`
  (superuser) before the service rollout — the app itself never holds
  superuser credentials.
- **The app runs as `app_user`**, which has no `UPDATE`/`DELETE` on
  `audit_events` (see `my-app/prisma/migrations/...app_role/migration.sql`).

Select the cloud with repo variables `DEPLOY_ENABLED=true` and
`DEPLOY_CLOUD=aws|azure|gcp`, matching the Pulumi stacks in `infra/stacks/`.

## AWS (ECS Fargate + RDS)

1. Create (once) the GitHub OIDC identity provider
   `token.actions.githubusercontent.com` in IAM.
2. Create role `ops-console-deployer` with a trust policy scoped to this repo
   and branch only:
   ```json
   {
     "Effect": "Allow",
     "Principal": { "Federated": "arn:aws:iam::<account>:oidc-provider/token.actions.githubusercontent.com" },
     "Action": "sts:AssumeRoleWithWebIdentity",
     "Condition": {
       "StringEquals": {
         "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
         "token.actions.githubusercontent.com:sub": "repo:vishaalpersonal/devin-demo:ref:refs/heads/main"
       }
     }
   }
   ```
3. Attach a minimal policy: `ecr:GetAuthorizationToken` +
   push/pull on the single `ops-console` ECR repo;
   `ecs:UpdateService`/`ecs:DescribeServices`/`ecs:RegisterTaskDefinition`/
   `ecs:RunTask` (migration job) on the ops-console cluster/service ARNs;
   `iam:PassRole` on the task roles only; `secretsmanager:GetSecretValue` on
   the specific `ops-console/*` secrets. No `*` resources.
4. Store `DATABASE_URL` and `MIGRATE_DATABASE_URL` in Secrets Manager; the
   task definition references them via `secrets.valueFrom`.
5. Set repo variables `AWS_DEPLOY_ROLE_ARN` and `AWS_REGION`.

## Azure (Container Apps + Azure Database for PostgreSQL)

1. Create an Entra ID app registration `ops-console-deployer` (no client
   secret).
2. Add a **federated credential**: issuer
   `https://token.actions.githubusercontent.com`, subject
   `repo:vishaalpersonal/devin-demo:ref:refs/heads/main`, audience
   `api://AzureADTokenExchange`.
3. Assign it **Contributor scoped to the single resource group** containing
   the Container App environment, ACR, and database — not the subscription.
4. Store `DATABASE_URL` / `MIGRATE_DATABASE_URL` in Key Vault; the Container
   App references them as secret refs. Migrations run as a Container Apps
   Job with `MIGRATE_DATABASE_URL`.
5. Set repo variables `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`,
   `AZURE_SUBSCRIPTION_ID`.

## GCP (Cloud Run + Cloud SQL)

1. Create a Workload Identity Pool + provider for
   `https://token.actions.githubusercontent.com`, with an attribute condition
   restricting to `assertion.repository == 'vishaalpersonal/devin-demo'` (and
   `assertion.ref == 'refs/heads/main'`).
2. Create service account `ops-console-deployer@<project>.iam.gserviceaccount.com`
   with only: `roles/run.developer` (deploy the one Cloud Run service),
   `roles/artifactregistry.writer` on the single repository, and
   `roles/iam.serviceAccountUser` on the Cloud Run runtime SA only.
3. Allow the pool principal to impersonate it via
   `roles/iam.workloadIdentityUser`.
4. Store `DATABASE_URL` / `MIGRATE_DATABASE_URL` in Secret Manager; Cloud Run
   mounts `DATABASE_URL`; migrations run as a Cloud Run Job with
   `MIGRATE_DATABASE_URL`.
5. Set repo variables `GCP_WORKLOAD_IDENTITY_PROVIDER` (full provider
   resource name) and `GCP_SERVICE_ACCOUNT`.
