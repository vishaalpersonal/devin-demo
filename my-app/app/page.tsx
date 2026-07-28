import { prisma } from "@/lib/prisma";
import { createTodo, deleteTodo, toggleTodo } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

export default async function Home() {
  const todos = await prisma.todo.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle>Todos</CardTitle>
          <CardDescription>
            Next.js + Prisma (SQLite) + shadcn/ui, running locally.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form action={createTodo} className="flex gap-2">
            <Input name="title" placeholder="Add a todo..." required />
            <Button type="submit">Add</Button>
          </form>
          <ul className="flex flex-col gap-2">
            {todos.map((todo) => (
              <li
                key={todo.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <form
                  action={toggleTodo.bind(null, todo.id, !todo.completed)}
                >
                  <button
                    type="submit"
                    className={
                      todo.completed
                        ? "text-muted-foreground line-through"
                        : ""
                    }
                  >
                    {todo.title}
                  </button>
                </form>
                <form action={deleteTodo.bind(null, todo.id)}>
                  <Button variant="ghost" size="sm" type="submit">
                    Delete
                  </Button>
                </form>
              </li>
            ))}
            {todos.length === 0 && (
              <li className="text-muted-foreground text-sm">
                No todos yet. Add one above.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
