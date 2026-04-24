import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Known Gap</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Sign in with your username to access your knowledge graph.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
