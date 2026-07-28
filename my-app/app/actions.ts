"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createTodo(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  await prisma.todo.create({ data: { title } });
  revalidatePath("/");
}

export async function toggleTodo(id: number, completed: boolean) {
  await prisma.todo.update({ where: { id }, data: { completed } });
  revalidatePath("/");
}

export async function deleteTodo(id: number) {
  await prisma.todo.delete({ where: { id } });
  revalidatePath("/");
}
