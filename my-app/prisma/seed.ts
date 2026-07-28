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

  const kycCases: Array<{
    customerName: string;
    customerEmail: string;
    riskScore: number;
    status: "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "ESCALATED";
    notes?: string;
  }> = [
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
    {
      customerName: "Viktor Baranov",
      customerEmail: "viktor@example.com",
      riskScore: 88,
      status: "PENDING",
      notes: "Sanctions screening hit on a similar name; manual review required.",
    },
    {
      customerName: "Lucía Fernández",
      customerEmail: "lucia@example.com",
      riskScore: 45,
      status: "IN_REVIEW",
      notes: "Selfie liveness check inconclusive; second document requested.",
    },
    {
      customerName: "Kwame Mensah",
      customerEmail: "kwame@example.com",
      riskScore: 93,
      status: "ESCALATED",
      notes: "PEP match confirmed; escalated for enhanced due diligence.",
    },
    {
      customerName: "Mei-Ling Chen",
      customerEmail: "meiling@example.com",
      riskScore: 8,
      status: "PENDING",
    },
    {
      customerName: "Jordan Blake",
      customerEmail: "jordan@example.com",
      riskScore: 64,
      status: "REJECTED",
      notes: "Submitted identity document reported stolen.",
    },
  ];
  for (const kycCase of kycCases) {
    const existing = await prisma.kycCase.findFirst({
      where: { customerEmail: kycCase.customerEmail },
    });
    if (!existing) await prisma.kycCase.create({ data: kycCase });
  }

  const payments: Array<{
    externalId: string;
    customerName: string;
    customerEmail: string;
    amountCents: number;
    status: "SETTLED" | "PENDING" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED";
    refundedCents?: number;
  }> = [
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
    {
      externalId: "pay_1004",
      customerName: "Marcus Bell",
      customerEmail: "marcus@example.com",
      amountCents: 39_99,
      status: "SETTLED",
    },
    {
      externalId: "pay_1005",
      customerName: "Lena Fischer",
      customerEmail: "lena@example.com",
      amountCents: 512_00,
      status: "SETTLED",
    },
    {
      externalId: "pay_1006",
      customerName: "Ravi Patel",
      customerEmail: "ravi@example.com",
      amountCents: 150_00,
      status: "REFUNDED",
      refundedCents: 150_00,
    },
    {
      externalId: "pay_1007",
      customerName: "Sofia Alvarez",
      customerEmail: "sofia@example.com",
      amountCents: 89_50,
      status: "FAILED",
    },
    {
      externalId: "pay_1008",
      customerName: "Tom Okonkwo",
      customerEmail: "tom@example.com",
      amountCents: 1_250_00,
      status: "SETTLED",
    },
  ];
  for (const payment of payments) {
    await prisma.payment.upsert({
      where: { externalId: payment.externalId },
      update: {},
      create: payment,
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
