import "server-only";

import { prisma } from "@/lib/prisma";
import type {
  FeatureFlag,
  FlagEnvironment,
} from "@/app/generated/prisma/client";

/**
 * Flag store abstraction. The console is an admin panel over this interface,
 * not necessarily the source of truth: swap `DatabaseFlagProvider` for a
 * LaunchDarkly/Statsig/etc. implementation without touching pages or the
 * flag service.
 */
export type FlagView = Pick<
  FeatureFlag,
  "id" | "key" | "environment" | "description" | "enabled" | "updatedAt"
>;

export interface FlagProvider {
  listFlags(environment?: FlagEnvironment): Promise<FlagView[]>;
  getFlag(id: string): Promise<FlagView | null>;
  setFlag(id: string, enabled: boolean): Promise<FlagView>;
}

class DatabaseFlagProvider implements FlagProvider {
  listFlags(environment?: FlagEnvironment) {
    return prisma.featureFlag.findMany({
      where: environment ? { environment } : undefined,
      orderBy: [{ key: "asc" }, { environment: "asc" }],
    });
  }

  getFlag(id: string) {
    return prisma.featureFlag.findUnique({ where: { id } });
  }

  setFlag(id: string, enabled: boolean) {
    return prisma.featureFlag.update({ where: { id }, data: { enabled } });
  }
}

export function getFlagProvider(): FlagProvider {
  return new DatabaseFlagProvider();
}
