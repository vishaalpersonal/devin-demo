/**
 * MOCK INFRASTRUCTURE — illustrative only, never deployed.
 *
 * The app is a standard Next.js container that needs exactly two inputs:
 *   - DATABASE_URL          (restricted runtime role)
 *   - MIGRATE_DATABASE_URL  (used by the migration job, not the app)
 * which makes it portable across any container runtime + managed Postgres:
 *   aws   -> ECS Fargate + RDS PostgreSQL
 *   azure -> Container Apps + Azure Database for PostgreSQL
 *   gcp   -> Cloud Run + Cloud SQL for PostgreSQL
 *
 * Each module returns the same shape so CI/CD can stay cloud-agnostic.
 */
import * as pulumi from "@pulumi/pulumi";
import { deployAws } from "./stacks/aws";
import { deployAzure } from "./stacks/azure";
import { deployGcp } from "./stacks/gcp";

export type CloudOutputs = {
  serviceUrl: pulumi.Output<string>;
  databaseUrlSecretRef: pulumi.Output<string>;
};

const config = new pulumi.Config();
const cloud = config.require("cloud"); // "aws" | "azure" | "gcp"
const image = config.get("image") ?? "ghcr.io/acmepay/ops-console:latest";

let outputs: CloudOutputs;
switch (cloud) {
  case "aws":
    outputs = deployAws(image);
    break;
  case "azure":
    outputs = deployAzure(image);
    break;
  case "gcp":
    outputs = deployGcp(image);
    break;
  default:
    throw new Error(`Unknown cloud: ${cloud}`);
}

export const serviceUrl = outputs.serviceUrl;
export const databaseUrlSecretRef = outputs.databaseUrlSecretRef;
