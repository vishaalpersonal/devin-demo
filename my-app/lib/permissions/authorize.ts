import type { Role } from "@/app/generated/prisma/enums";
import { hasPermission, type Permission } from "./index";

export class AuthError extends Error {
  constructor(
    public code: "UNAUTHENTICATED" | "FORBIDDEN",
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export type AuthorizableUser = { role: Role };

/** Central server-side authorization check. Throws on failure. */
export function authorize(user: AuthorizableUser, permission: Permission): void {
  if (!hasPermission(user.role, permission)) {
    throw new AuthError(
      "FORBIDDEN",
      `Role ${user.role} lacks permission ${permission}`,
    );
  }
}
