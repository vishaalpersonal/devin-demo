// MOCK: Cloud Run + Cloud SQL for PostgreSQL sketch.
import * as pulumi from "@pulumi/pulumi";
import type { CloudOutputs } from "../index";

export function deployGcp(image: string): CloudOutputs {
  // Real implementation (via @pulumi/gcp):
  //   const db = new gcp.sql.DatabaseInstance("ops-db", {
  //     databaseVersion: "POSTGRES_16",
  //     settings: { tier: "db-f1-micro" },
  //   });
  //   new gcp.cloudrunv2.Service("ops-console", {
  //     location: "us-central1",
  //     template: {
  //       containers: [{ image, ports: { containerPort: 3000 },
  //         envs: [{ name: "DATABASE_URL",
  //           valueSource: { secretKeyRef: { secret: "ops-database-url", version: "latest" } } }] }],
  //       annotations: { "run.googleapis.com/cloudsql-instances": db.connectionName },
  //     },
  //   });
  //   Migrations: Cloud Run Job with MIGRATE_DATABASE_URL before rollout.
  return {
    serviceUrl: pulumi.output(`https://ops-console.example.run.app (mock, image=${image})`),
    databaseUrlSecretRef: pulumi.output(
      "secretmanager: projects/mock/secrets/ops-database-url (mock)",
    ),
  };
}
