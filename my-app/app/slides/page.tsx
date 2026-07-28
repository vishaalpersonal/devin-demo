"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

function Check() {
  return <span className="text-green-600">✓</span>;
}
function Cross() {
  return <span className="text-red-500">✗</span>;
}
function Partial() {
  return <span className="text-amber-500">◐</span>;
}

type EvalRow = {
  feature: string;
  retool: React.ReactNode;
  devin: React.ReactNode;
};

const EVAL_ROWS: EvalRow[] = [
  {
    feature: "Speed to first working internal tool",
    retool: (
      <span>
        <Check /> Hours — drag-and-drop over live data
      </span>
    ),
    devin: (
      <span>
        <Check /> Hours — this console was built in ~2h of prompting
      </span>
    ),
  },
  {
    feature: "Governed actions (RBAC, maker-checker, audit)",
    retool: (
      <span>
        <Partial /> Platform-level permissions & query logs; domain rules
        (refund limits, four-eyes) are still yours to build
      </span>
    ),
    devin: (
      <span>
        <Check /> First-class: server-side authorize(), configurable approver
        counts, append-only domain audit — all in owned code
      </span>
    ),
  },
  {
    feature: "Customization ceiling (custom UX, ML, novel logic)",
    retool: (
      <span>
        <Cross /> Bounded by component/query model; complex apps hit the
        abstraction ceiling
      </span>
    ),
    devin: (
      <span>
        <Check /> None — it&apos;s a normal TypeScript codebase; Devin extends
        it (e.g. fraud-risk models) like any repo
      </span>
    ),
  },
  {
    feature: "Managed platform (hosting, connectors, SSO, upgrades)",
    retool: (
      <span>
        <Check /> Included — Retool operates it for you
      </span>
    ),
    devin: (
      <span>
        <Cross /> You own deploy, on-call, security patching; Devin reduces but
        does not remove this burden
      </span>
    ),
  },
  {
    feature: "Cost at this team's scale (3 apps, ~60 eng)",
    retool: (
      <span>
        <Cross /> $250K/yr license, rising with seats & enterprise features
      </span>
    ),
    devin: (
      <span>
        <Check /> Infra ~$10-20K/yr + maintenance time; Devin sessions amortize
        the build & upkeep
      </span>
    ),
  },
];

const SLIDES: { title: string; kicker: string; body: React.ReactNode }[] = [
  {
    kicker: "Build vs Buy",
    title: "Replacing Retool with a Devin-built ops console",
    body: (
      <div className="flex flex-col gap-6 text-lg">
        <p className="text-muted-foreground">
          A Series C fintech · ~60 engineers · $250K/yr on Retool for 3
          internal apps: KYC review, refunds, feature flags.
        </p>
        <p>
          Question: could the team build and own a lightweight in-house
          alternative using Devin?
        </p>
        <p className="text-sm text-muted-foreground">
          Use ← → arrow keys or the buttons to navigate.
        </p>
      </div>
    ),
  },
  {
    kicker: "Retool",
    title: "The most important aspects of Retool",
    body: (
      <div className="flex flex-col gap-4">
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Speed to internal software:</strong> Retool collapses the
            cost of building CRUD-heavy operational tools — from database/API
            to a usable KYC queue or refunds dashboard extremely quickly.
          </li>
          <li>
            <strong>Data connectivity:</strong> the real primitive is not
            drag-and-drop UI — it&apos;s making databases, APIs, and SaaS
            systems immediately usable inside an application without building
            glue infrastructure.
          </li>
          <li>
            <strong>Governance around privileged actions:</strong> for fintech,
            RBAC, SSO, secrets, permissions, audit logs, and controlled access
            to production systems matter more than the component library
            itself.
          </li>
          <li>
            <strong>A shared runtime and operating model:</strong> every
            internal app gets the same deployment, environments, permissions,
            monitoring, and maintenance model. You&apos;re buying the platform
            underneath the apps, not just the apps.
          </li>
          <li>
            <strong>Low marginal cost of the next tool:</strong> once Retool is
            established, app #4 or #20 is cheap to add.
          </li>
        </ul>
        <p className="rounded-md border bg-muted/50 p-4 text-sm">
          The tradeoff: as individual apps become more complex or specialized,
          Retool&apos;s abstractions become constraints — and owning
          conventional software starts to look more attractive.
        </p>
      </div>
    ),
  },
  {
    kicker: "Architecture",
    title: "Governed operational console — one shared foundation, three thin apps",
    body: (
      <div className="flex flex-col gap-3">
        <Image
          src="/architecture-diagram.png"
          alt="Architecture: Next.js server with mutation pipeline, governance rules, audit, swappable seams (auth, flags, ledger), PostgreSQL with append-only audit_events, pluggable vendors, cloud-agnostic deploy targets"
          width={1024}
          height={563}
          className="w-full rounded-md border"
          priority
        />
        <p className="text-sm text-muted-foreground">
          Every sensitive action runs the same pipeline: authenticate →
          authorize → validate → domain service → audit. Green seams swap for
          real vendors (Okta, LaunchDarkly, PSP) without touching pages or
          services.
        </p>
      </div>
    ),
  },
  {
    kicker: "1 · Research",
    title: "What Retool actually provides — and where its value lies",
    body: (
      <div className="flex flex-col gap-4">
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Visible layer:</strong> drag-and-drop tables, forms, and
            queries over production databases and APIs — zero-to-useful in
            hours.
          </li>
          <li>
            <strong>Invisible layer (the real value):</strong> managed hosting,
            data connectors, SSO, centralized RBAC, audit logging, and
            environments — the governance a fintech must have.
          </li>
          <li>
            <strong>Why customers leave:</strong> complexity outgrows the
            component model, performance degrades, production tooling is gated
            behind enterprise pricing, and the app can&apos;t leave the
            platform (lock-in).
          </li>
        </ul>
        <p className="rounded-md border bg-muted/50 p-4 text-sm">
          For this team the core value is not the app builder — it&apos;s{" "}
          <strong>governed interfaces for sensitive operational actions</strong>
          : who can see what, who can move money, who approved it, and proof of
          all of it.
        </p>
      </div>
    ),
  },
  {
    kicker: "2 · Prototype",
    title: "What Devin built in ~2 hours of prompting",
    body: (
      <div className="flex flex-col gap-4">
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Three working apps</strong> on one shared foundation: KYC
            review queue, refunds dashboard, feature-flag admin — the exact
            Retool footprint.
          </li>
          <li>
            <strong>Server-side RBAC</strong> — permissions enforced in{" "}
            <code>authorize()</code>, not hidden buttons; three roles (support,
            compliance, admin).
          </li>
          <li>
            <strong>Fintech guardrails:</strong> required reasons, maker-checker
            approvals (requester ≠ approver), self-serve refund limits,
            idempotent money movement, high-risk KYC warnings.
          </li>
          <li>
            <strong>Append-only audit log</strong> enforced at the database
            layer; every action (including denials) recorded.
          </li>
          <li>
            <strong>Swappable seams:</strong> auth → Okta OIDC, flags →
            LaunchDarkly, ledger → real PSP — interfaces already in place.
          </li>
          <li>
            <strong>Conventional repo:</strong> Next.js + TypeScript + Postgres,
            32 passing tests, one-command startup, CI/CD scaffolding.
          </li>
        </ul>
        <p className="text-sm text-muted-foreground">
          Not built (deliberately): drag-and-drop builder, generic connectors,
          workflow engine — that is Retool&apos;s platform, not this
          team&apos;s need.
        </p>
      </div>
    ),
  },
  {
    kicker: "3 · Evaluate",
    title: "What can honestly be replicated with Devin",
    body: (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-4 font-semibold">Area</th>
              <th className="py-2 pr-4 font-semibold">
                Replicable with Devin?
              </th>
              <th className="py-2 font-semibold">Honest assessment / risk</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b align-top">
              <td className="py-3 pr-4 font-medium">App UI + CRUD</td>
              <td className="py-3 pr-4 whitespace-nowrap">
                <Check /> <strong>Yes</strong>
              </td>
              <td className="py-3">
                Tables, forms, queues, dashboards, search, and actions are
                straightforward. Low risk.
              </td>
            </tr>
            <tr className="border-b align-top">
              <td className="py-3 pr-4 font-medium">
                Data + API integrations
              </td>
              <td className="py-3 pr-4 whitespace-nowrap">
                <Check /> <strong>Yes</strong>
              </td>
              <td className="py-3">
                Easy to connect existing services. Risk is bypassing domain
                APIs with unsafe direct DB access.
              </td>
            </tr>
            <tr className="border-b align-top">
              <td className="py-3 pr-4 font-medium">Auth, RBAC + audit</td>
              <td className="py-3 pr-4 whitespace-nowrap">
                <Partial /> <strong>Partially</strong>
              </td>
              <td className="py-3">
                Basic versions are easy; production-grade permissions and
                compliance-grade auditability require real engineering.
              </td>
            </tr>
            <tr className="border-b align-top">
              <td className="py-3 pr-4 font-medium">
                Workflows + operations
              </td>
              <td className="py-3 pr-4 whitespace-nowrap">
                <Partial /> <strong>Partially</strong>
              </td>
              <td className="py-3">
                Jobs, approvals, retries, CI/CD, and monitoring are buildable,
                but the team now owns reliability and incidents.
              </td>
            </tr>
            <tr className="border-b align-top">
              <td className="py-3 pr-4 font-medium">Retool as a platform</td>
              <td className="py-3 pr-4 whitespace-nowrap">
                <Cross /> <strong>Not worth replicating</strong>
              </td>
              <td className="py-3">
                Generic connectors, visual builder, governance, and reusable
                platform infrastructure are where Retool has real depth.
                Building these defeats the purpose.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    ),
  },
  {
    kicker: "3 · Evaluate",
    title: "Retool vs Cognition (Devin + owned code) — top 5 factors",
    body: (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-4 font-semibold">Feature</th>
              <th className="py-2 pr-4 font-semibold">Retool</th>
              <th className="py-2 font-semibold">Cognition (Devin)</th>
            </tr>
          </thead>
          <tbody>
            {EVAL_ROWS.map((r) => (
              <tr key={r.feature} className="border-b align-top">
                <td className="py-3 pr-4 font-medium">{r.feature}</td>
                <td className="py-3 pr-4">{r.retool}</td>
                <td className="py-3">{r.devin}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-sm text-muted-foreground">
          Honest gaps on the build side: real SSO, tamper-evident audit
          storage, observability, HA database, and an on-call owner — all
          addressable, none free.
        </p>
      </div>
    ),
  },
  {
    kicker: "4 · Recommend",
    title: "Build — with eyes open, validated by a 3-week POC",
    body: (
      <div className="flex flex-col gap-4">
        <p>
          <strong>Recommendation: build.</strong> At 3 apps and $250K/yr, this
          team is past the point where Retool&apos;s managed convenience beats
          ownership. The prototype shows the hard parts — governance, audit,
          approvals — are reproducible in hours with Devin, in code the team
          fully controls.
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Economics:</strong> the license alone funds a lot of
            maintenance; Devin compresses both the build and the ongoing
            change-cost (a new permission or workflow is a small, tested PR).
          </li>
          <li>
            <strong>Control:</strong> no abstraction ceiling, no per-seat
            pricing pressure, no platform lock-in; standard Git/CI/review
            workflows apply.
          </li>
          <li>
            <strong>Risk, honestly:</strong> you take on ops, security, and
            maintenance that Retool absorbed. That&apos;s the trade — validate
            it with a bounded POC before committing.
          </li>
        </ul>
        <p className="rounded-md border bg-muted/50 p-4 text-sm">
          A well-reasoned &quot;don&apos;t build&quot; would apply if the team
          had 20+ Retool apps, heavy connector use, or no appetite to own
          internal tooling. None of those hold here.
        </p>
      </div>
    ),
  },
  {
    kicker: "5 · Path to production",
    title: "Where Devin fits next: a 3-week POC, then beyond Retool's limits",
    body: (
      <div className="flex flex-col gap-4">
        <ol className="list-decimal space-y-2 pl-6">
          <li>
            <strong>Week 1 — Identity & environments:</strong> NextAuth + Okta
            OIDC behind the existing <code>getSession()</code> seam, staging
            deploy on managed Postgres, secrets in the cloud secret manager.
          </li>
          <li>
            <strong>Week 2 — Real integrations:</strong> LaunchDarkly-backed
            flag provider, PSP-sandbox ledger with reconciliation,
            tamper-evident audit sink, OpenTelemetry.
          </li>
          <li>
            <strong>Week 3 — Pilot & decision:</strong> compliance team runs
            the KYC queue on staging data; load test, security review, signed
            go/no-go.
          </li>
        </ol>
        <p>
          Then go <strong>beyond what Retool could do:</strong> Devin can extend
          the KYC review with custom fraud models, third-party risk-score
          prediction, or any bespoke workflow — because it&apos;s just code in
          a repo Devin already knows.
        </p>
        <p className="text-sm text-muted-foreground">
          Devin&apos;s role: built the prototype, maintains the codebase, and
          executes each POC step as reviewable PRs — the same way your
          engineers work.
        </p>
      </div>
    ),
  },
];

export default function SlidesPage() {
  const [index, setIndex] = useState(0);

  const go = useCallback((delta: number) => {
    setIndex((i) => Math.min(SLIDES.length - 1, Math.max(0, i + delta)));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const slide = SLIDES[index];

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-6 px-6 py-8">
      <div className="flex min-h-[520px] flex-col gap-4 rounded-lg border bg-background p-10 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {slide.kicker}
        </p>
        <h1 className="text-2xl font-semibold leading-tight">{slide.title}</h1>
        <div className="mt-2 flex-1">{slide.body}</div>
      </div>
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => go(-1)} disabled={index === 0}>
          ← Previous
        </Button>
        <div className="flex items-center gap-2">
          {SLIDES.map((s, i) => (
            <button
              key={s.title}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-2.5 w-2.5 rounded-full ${
                i === index ? "bg-foreground" : "bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
        <Button
          variant="outline"
          onClick={() => go(1)}
          disabled={index === SLIDES.length - 1}
        >
          Next →
        </Button>
      </div>
    </div>
  );
}
