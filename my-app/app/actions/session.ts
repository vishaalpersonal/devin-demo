"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { devUserCookieName } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Dev-only: backs the header user switcher. Replaced by real auth. */
export async function switchUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  const store = await cookies();
  store.set(devUserCookieName, userId, { httpOnly: true, sameSite: "lax" });
  revalidatePath("/", "layout");
}
