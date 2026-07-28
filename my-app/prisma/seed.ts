import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { RULE_DEFAULTS } from "../lib/services/rule-defaults";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const [support, compliance, admin] = await Promise.all([
    prisma.user.upsert({
      where: { email: "sam.support@acmepay.dev" },
      update: {},
      create: {
        email: "sam.support@acmepay.dev",
        name: "Sam Rivera",
        role: "SUPPORT_AGENT",
      },
    }),
    prisma.user.upsert({
      where: { email: "casey.compliance@acmepay.dev" },
      update: {},
      create: {
        email: "casey.compliance@acmepay.dev",
        name: "Casey Nguyen",
        role: "COMPLIANCE_REVIEWER",
      },
    }),
    prisma.user.upsert({
      where: { email: "alex.admin@acmepay.dev" },
      update: {},
      create: {
        email: "alex.admin@acmepay.dev",
        name: "Alex Okafor",
        role: "ADMINISTRATOR",
      },
    }),
  ]);

  for (const [key, def] of Object.entries(RULE_DEFAULTS)) {
    await prisma.governanceRule.upsert({
      where: { key },
      update: {},
      create: {
        key,
        description: def.description,
        valueInt: def.valueInt ?? null,
        valueBool: def.valueBool ?? null,
      },
    });
  }

  const flags: Array<{
    key: string;
    description: string;
    envs: Array<["DEVELOPMENT" | "STAGING" | "PRODUCTION", boolean]>;
  }> = [
    {
      key: "instant-payouts",
      description: "Enable instant payout rail for eligible merchants",
      envs: [
        ["DEVELOPMENT", true],
        ["STAGING", true],
        ["PRODUCTION", false],
      ],
    },
    {
      key: "new-kyc-vendor",
      description: "Route new KYC checks through the replacement vendor",
      envs: [
        ["DEVELOPMENT", true],
        ["STAGING", false],
        ["PRODUCTION", false],
      ],
    },
    {
      key: "refunds-v2-ui",
      description: "Show the redesigned refunds flow to internal users",
      envs: [
        ["DEVELOPMENT", true],
        ["STAGING", true],
        ["PRODUCTION", true],
      ],
    },
  ];
  for (const flag of flags) {
    for (const [environment, enabled] of flag.envs) {
      await prisma.featureFlag.upsert({
        where: { key_environment: { key: flag.key, environment } },
        update: {},
        create: {
          key: flag.key,
          environment,
          description: flag.description,
          enabled,
        },
      });
    }
  }

  if ((await prisma.kycCase.count()) === 0) {
    await prisma.kycCase.createMany({
      data: [
        {
          customerName: "Dana Whitfield",
          customerEmail: "dana@example.com",
          riskScore: 22,
          status: "PENDING",
        },
        {
          customerName: "Omar Haddad",
          customerEmail: "omar@example.com",
          riskScore: 71,
          status: "IN_REVIEW",
          notes: "Document mismatch on address; awaiting proof of residence.",
        },
        {
          customerName: "Priya Raman",
          customerEmail: "priya@example.com",
          riskScore: 12,
          status: "APPROVED",
        },
      ],
    });
  }

  if ((await prisma.payment.count()) === 0) {
    await prisma.payment.createMany({
      data: [
        {
          externalId: "pay_1001",
          customerName: "Dana Whitfield",
          customerEmail: "dana@example.com",
          amountCents: 12_50,
          status: "SETTLED",
        },
        {
          externalId: "pay_1002",
          customerName: "Omar Haddad",
          customerEmail: "omar@example.com",
          amountCents: 249_99,
          status: "SETTLED",
        },
        {
          externalId: "pay_1003",
          customerName: "Priya Raman",
          customerEmail: "priya@example.com",
          amountCents: 78_00,
          status: "PARTIALLY_REFUNDED",
          refundedCents: 20_00,
        },
      ],
    });
  }

  if ((await prisma.auditEvent.count()) === 0) {
    await prisma.auditEvent.createMany({
      data: [
        {
          actorId: admin.id,
          actorName: admin.name,
          actorRole: admin.role,
          action: "flag.changed",
          resourceType: "FeatureFlag",
          resourceId: "seed",
          result: "SUCCESS",
          metadata: { key: "refunds-v2-ui", environment: "STAGING", to: true },
          correlationId: "seed-1",
        },
        {
          actorId: compliance.id,
          actorName: compliance.name,
          actorRole: compliance.role,
          action: "kyc.case_approved",
          resourceType: "KycCase",
          resourceId: "seed",
          result: "SUCCESS",
          metadata: { customer: "Priya Raman" },
          correlationId: "seed-2",
        },
        {
          actorId: support.id,
          actorName: support.name,
          actorRole: support.role,
          action: "flag.approval_denied",
          resourceType: "FlagChangeRequest",
          resourceId: "seed",
          result: "DENIED",
          metadata: { rule: "missing permission flags.approve" },
          correlationId: "seed-3",
        },
      ],
    });
  }

  console.log("Seeded users:", support.email, compliance.email, admin.email);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
