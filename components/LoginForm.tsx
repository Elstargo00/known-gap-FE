"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Login failed.");
      }
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="text-sm font-medium" htmlFor="username">
        Username
      </label>
      <input
        id="username"
        type="text"
        required
        autoComplete="username"
        autoFocus
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="admin"
        className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
      />
      <label className="text-sm font-medium" htmlFor="password">
        Password
      </label>
      <input
        id="password"
        type="password"
        required
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
      />
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <button
        type="submit"
        disabled={pending || !username || !password}
        className="mt-2 inline-flex items-center justify-center rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 transition-colors"
      >
        {pending ? "Signing in…" : "Continue"}
      </button>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
        Demo credentials live in <code>.env.local</code>. The username
        deterministically derives a user id, so the same login always lands
        in the same knowledge graph.
      </p>
    </form>
  );
}
