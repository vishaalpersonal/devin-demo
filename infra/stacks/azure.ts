// MOCK: Azure Container Apps + Azure Database for PostgreSQL sketch.
import * as pulumi from "@pulumi/pulumi";
import type { CloudOutputs } from "../index";

export function deployAzure(image: string): CloudOutputs {
  // Real implementation (via @pulumi/azure-native):
  //   const rg = new azure.resources.ResourceGroup("ops");
  //   const pg = new azure.dbforpostgresql.Server("ops-db", {
  //     resourceGroupName: rg.name, sku: { name: "Standard_B1ms", tier: "Burstable" },
  //     version: "16", administratorLogin: "postgres", ...
  //   });
  //   const env = new azure.app.ManagedEnvironment("ops-env", { resourceGroupName: rg.name });
  //   new azure.app.ContainerApp("ops-console", {
  //     resourceGroupName: rg.name, managedEnvironmentId: env.id,
  //     template: { containers: [{ name: "web", image,
  //       env: [{ name: "DATABASE_URL", secretRef: "database-url" }] }] },
  //     configuration: { ingress: { external: true, targetPort: 3000 },
  //       secrets: [{ name: "database-url", value: dbUrl }] },
  //   });
  //   Migrations: Container Apps Job with MIGRATE_DATABASE_URL before rollout.
  return {
    serviceUrl: pulumi.output(`https://ops-console.example.azurecontainerapps.io (mock, image=${image})`),
    databaseUrlSecretRef: pulumi.output("containerapp secret database-url (mock)"),
  };
}
