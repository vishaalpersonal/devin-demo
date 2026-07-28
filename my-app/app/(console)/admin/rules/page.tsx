import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { listRules } from "@/lib/services/rules";
import { RuleEditor } from "@/components/rules/rule-editor";

export const dynamic = "force-dynamic";

export default async function RulesPage() {
  const session = await requireSession();
  if (!hasPermission(session.user.role, "rules.read")) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view governance rules.
      </p>
    );
  }
  const rules = await listRules();
  const canWrite = hasPermission(session.user.role, "rules.write");

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Governance Rules</h1>
        <p className="text-sm text-muted-foreground">
          Contextual controls interpreted by domain services (approval
          thresholds, self-serve limits). Coarse permission checks stay in
          authorize(); these rules refine behavior per action. In production
          these could be sourced from an IdP/policy system such as Okta groups.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {rules.map((rule) => (
          <RuleEditor
            key={rule.key}
            rule={{
              key: rule.key,
              description: rule.description,
              valueInt: rule.valueInt,
              valueBool: rule.valueBool,
            }}
            canWrite={canWrite}
          />
        ))}
      </div>
    </div>
  );
}
