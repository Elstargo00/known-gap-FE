"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type {
  AskMode,
  AskResponse,
  Concept,
  IngestResponse,
} from "@/lib/types";
import { ClozeBadge, ClozeText, countClozeBlanks } from "./ClozeText";

const MODES: { id: AskMode; label: string; hint: string }[] = [
  { id: "normal", label: "Normal", hint: "Vanilla RAG answer." },
  {
    id: "learning",
    label: "Learning",
    hint: "Concepts you've mastered are masked as fill-in-the-blanks.",
  },
  {
    id: "concise",
    label: "Concise",
    hint: "Skip everything you already know.",
  },
];

export function Workspace({ email }: { email: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<AskMode>("normal");
  const [query, setQuery] = useState("");
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<AskResponse | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lastUpload, setLastUpload] = useState<IngestResponse | null>(null);

  async function onAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setAskError(null);
    setAsking(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query, mode }),
      });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? data?.detail ?? "Ask failed.");
      }
      setAnswer(data as AskResponse);
    } catch (err) {
      setAskError(err instanceof Error ? err.message : "Ask failed.");
    } finally {
      setAsking(false);
    }
  }

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/ingest", { method: "POST", body: form });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? data?.detail ?? "Upload failed.");
      }
      setLastUpload(data as IngestResponse);
      setFile(null);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function onLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-block h-2 w-2 rounded-full bg-indigo-500" />
            <h1 className="text-lg font-semibold tracking-tight">Known Gap</h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">{email}</span>
            <button
              onClick={onLogout}
              className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 flex flex-col gap-8">
        <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {MODES.map((m) => {
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  title={m.hint}
                  className={
                    "rounded-full px-4 py-1.5 text-sm font-medium transition-colors border " +
                    (active
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400")
                  }
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          <form onSubmit={onAsk} className="flex flex-col gap-3">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything about your ingested documents…"
              rows={4}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-y"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {MODES.find((m) => m.id === mode)?.hint}
              </p>
              <button
                type="submit"
                disabled={asking || !query.trim()}
                className="inline-flex items-center justify-center rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 transition-colors"
              >
                {asking ? "Asking…" : "Ask"}
              </button>
            </div>
            {askError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {askError}
              </p>
            )}
          </form>
        </section>

        {answer && <AnswerPanel answer={answer} />}

        <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
          <h2 className="text-sm font-semibold tracking-tight mb-3">
            Ingest a document
          </h2>
          <form
            onSubmit={onUpload}
            className="flex flex-col sm:flex-row sm:items-center gap-3"
          >
            <input
              type="file"
              accept=".pdf,.md,.txt"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 dark:file:bg-zinc-800 file:px-3 file:py-1.5 file:text-sm hover:file:bg-zinc-200 dark:hover:file:bg-zinc-700 file:cursor-pointer"
            />
            <button
              type="submit"
              disabled={uploading || !file}
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 transition-colors"
            >
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </form>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
            Accepts .pdf, .md, or .txt up to 20 MB.
          </p>
          {uploadError && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2">
              {uploadError}
            </p>
          )}
          {lastUpload && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">
              Ingested{" "}
              <span className="font-medium">{lastUpload.filename}</span> —{" "}
              {lastUpload.chunk_count} chunk
              {lastUpload.chunk_count === 1 ? "" : "s"}.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

function AnswerPanel({ answer }: { answer: AskResponse }) {
  const showConcepts = answer.mode !== "normal";
  const isLearning = answer.mode === "learning";
  const blankCount = isLearning ? countClozeBlanks(answer.answer) : 0;
  const [showSources, setShowSources] = useState(false);
  const [revealKey, setRevealKey] = useState(0);

  return (
    <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm flex flex-col gap-6">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight">Answer</h2>
            <span className="text-xs rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 px-2 py-0.5 font-medium">
              {answer.mode}
            </span>
            {isLearning && <ClozeBadge text={answer.answer} />}
          </div>
          {isLearning && blankCount > 0 && (
            <button
              type="button"
              onClick={() => setRevealKey((k) => k + 1)}
              className="text-xs rounded-md border border-zinc-300 dark:border-zinc-700 px-2.5 py-1 text-zinc-600 dark:text-zinc-300 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              Reset blanks
            </button>
          )}
        </div>
        {isLearning && blankCount > 0 && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
            Click each blank to reveal the concept. Anything you've seen often
            enough is masked — try to recall it before peeking.
          </p>
        )}
        <div
          key={revealKey}
          className="text-sm leading-7 whitespace-pre-wrap"
        >
          <ClozeText text={answer.answer} interactive={isLearning} />
        </div>
      </div>

      {answer.sources.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold tracking-tight">
              Sources{" "}
              <span className="text-zinc-500 dark:text-zinc-400 font-normal">
                ({answer.sources.length})
              </span>
            </h3>
            <button
              type="button"
              onClick={() => setShowSources((v) => !v)}
              aria-expanded={showSources}
              className="text-xs rounded-md border border-zinc-300 dark:border-zinc-700 px-2.5 py-1 text-zinc-600 dark:text-zinc-300 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              {showSources ? "Hide" : "Show"}
            </button>
          </div>
          {showSources && (
            <ul className="flex flex-col gap-2">
              {answer.sources.map((s) => (
                <li
                  key={s.chunk_id}
                  className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{s.filename}</span>
                    <span className="text-zinc-500 dark:text-zinc-400 tabular-nums">
                      score {s.similarity_score.toFixed(3)}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-5 line-clamp-3">
                    {s.content_preview}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {showConcepts && (
        <div className="flex flex-col gap-3">
          <ConceptRow
            label="Known concepts"
            concepts={answer.known_concepts}
            variant="known"
            clozeConcepts={answer.cloze_concepts}
          />
          <ConceptRow
            label="Unknown concepts"
            concepts={answer.unknown_concepts}
            variant="unknown"
          />
        </div>
      )}
    </section>
  );
}

function ConceptRow({
  label,
  concepts,
  variant,
  clozeConcepts = [],
}: {
  label: string;
  concepts: Concept[];
  variant: "known" | "unknown";
  clozeConcepts?: string[];
}) {
  const clozeSet = new Set(clozeConcepts);
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
        {label}
      </h4>
      {concepts.length === 0 ? (
        <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">none</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {concepts.map((c) => (
            <ConceptPill
              key={c.canonical_name}
              concept={c}
              variant={variant}
              masked={clozeSet.has(c.canonical_name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ConceptPill({
  concept,
  variant,
  masked,
}: {
  concept: Concept;
  variant: "known" | "unknown";
  masked: boolean;
}) {
  const score = clampScore(concept.known_score);
  const baseClasses =
    variant === "known"
      ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-900"
      : "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 ring-indigo-200 dark:ring-indigo-900";
  const titleParts = [
    variant === "known"
      ? `Already in your graph: ${concept.canonical_name}`
      : `New (or below threshold) in your graph: ${concept.canonical_name}`,
    `known_score = ${score}/100`,
  ];
  if (masked) titleParts.push("Masked as cloze blank in this answer.");
  return (
    <span
      title={titleParts.join("\n")}
      className={
        "inline-flex items-center gap-1.5 text-xs rounded-full pl-2.5 pr-1 py-1 font-medium ring-1 " +
        baseClasses
      }
    >
      <span>{concept.display_name}</span>
      {masked && (
        <span
          aria-label="masked as cloze"
          className="text-[10px] uppercase tracking-wider rounded bg-white/60 dark:bg-black/30 px-1 py-px font-semibold"
        >
          cloze
        </span>
      )}
      <ScoreChip score={score} variant={variant} />
    </span>
  );
}

function ScoreChip({
  score,
  variant,
}: {
  score: number;
  variant: "known" | "unknown";
}) {
  const tone =
    variant === "known"
      ? "bg-emerald-600/90 text-white"
      : "bg-indigo-600/90 text-white";
  return (
    <span
      className={
        "inline-flex items-center justify-center rounded-full text-[10px] font-semibold tabular-nums px-1.5 py-0.5 min-w-[2ch] " +
        tone
      }
    >
      {score}
    </span>
  );
}

function clampScore(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}
