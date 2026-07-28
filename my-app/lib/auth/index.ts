import "server-only";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/app/generated/prisma/enums";
import { AuthError, authorize } from "@/lib/permissions/authorize";

/**
 * Auth seam. `getSession()` is the ONLY way application code learns who the
 * caller is. In production this module is replaced by a NextAuth/OIDC (e.g.
 * Okta) provider returning the same `Session` shape; nothing outside
 * `lib/auth` may read the dev cookie or know how sessions are produced.
 */
export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export type Session = { user: SessionUser };

const DEV_USER_COOKIE = "dev-user-id";

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const userId = store.get(DEV_USER_COOKIE)?.value;
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : await prisma.user.findFirst({ orderBy: { email: "asc" } });
  if (!user) return null;
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new AuthError("UNAUTHENTICATED", "No active session");
  return session;
}

export { AuthError, authorize };

/** Dev-only helper backing the header user switcher. */
export const devUserCookieName = DEV_USER_COOKIE;
