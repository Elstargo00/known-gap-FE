"use client";

import { Fragment, useState, type ReactNode } from "react";

/**
 * Render a string that may contain <cloze concept="canonical-name">surface</cloze>
 * tags emitted by the backend in learning mode. Each cloze span becomes a
 * click-to-reveal blank so the reader can self-test on concepts they've
 * already mastered (known_score > threshold).
 *
 * - Only the exact <cloze concept="..."> tag shape is parsed; all other angle
 *   brackets pass through as literal text.
 * - Unknown / malformed / unclosed tags degrade gracefully to plain text.
 * - When `interactive` is false (or no tags are present) the surface text is
 *   rendered inline with no special treatment, so callers can use the same
 *   component for normal/concise modes safely.
 * - Never uses dangerouslySetInnerHTML.
 */
export function ClozeText({
  text,
  interactive = true,
}: {
  text: string;
  interactive?: boolean;
}) {
  const nodes = parseClozeText(text);
  return (
    <>
      {nodes.map((node, i) => {
        if (node.kind === "text") {
          return <Fragment key={i}>{node.text}</Fragment>;
        }
        return (
          <ClozeBlank
            key={i}
            concept={node.concept}
            surface={node.text}
            interactive={interactive}
          />
        );
      })}
    </>
  );
}

function ClozeBlank({
  concept,
  surface,
  interactive,
}: {
  concept: string;
  surface: string;
  interactive: boolean;
}) {
  const [revealed, setRevealed] = useState(!interactive);

  if (!interactive || revealed) {
    return (
      <span
        title={`Concept: ${concept}`}
        className="rounded bg-emerald-100 dark:bg-emerald-950/60 px-1 font-medium text-emerald-800 dark:text-emerald-200 ring-1 ring-emerald-200/70 dark:ring-emerald-900"
      >
        {surface}
      </span>
    );
  }

  // Hint width based on the masked surface length so the layout stays stable
  // when the blank is revealed. Use ch units; clamp so single-letter blanks
  // are still clickable.
  const ch = Math.max(3, Math.min(surface.length, 24));

  return (
    <button
      type="button"
      onClick={() => setRevealed(true)}
      title={`Click to reveal — concept: ${concept}`}
      aria-label={`Cloze blank for concept ${concept}. Click to reveal.`}
      style={{ minWidth: `${ch}ch` }}
      className="inline-flex items-center justify-center align-baseline rounded border-b-2 border-dashed border-indigo-400 dark:border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 px-1 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-colors cursor-pointer"
    >
      <span aria-hidden="true" className="select-none tracking-widest">
        {"_".repeat(ch)}
      </span>
    </button>
  );
}

type TextNode =
  | { kind: "text"; text: string }
  | { kind: "cloze"; concept: string; text: string };

const OPEN_RE = /<cloze\s+concept\s*=\s*"([^"]*)"\s*>/i;
const CLOSE_TAG = "</cloze>";

export function parseClozeText(input: string): TextNode[] {
  const out: TextNode[] = [];
  let remaining = input;

  while (remaining.length > 0) {
    const openMatch = OPEN_RE.exec(remaining);
    if (!openMatch || openMatch.index === undefined) {
      out.push({ kind: "text", text: remaining });
      break;
    }
    if (openMatch.index > 0) {
      out.push({ kind: "text", text: remaining.slice(0, openMatch.index) });
    }
    const concept = openMatch[1];
    const afterOpen = remaining.slice(openMatch.index + openMatch[0].length);
    const closeIdx = afterOpen
      .toLowerCase()
      .indexOf(CLOSE_TAG.toLowerCase());
    if (closeIdx === -1) {
      // No closer; treat the whole open tag + remainder as literal text and
      // stop parsing further tags (safer than recursing infinitely).
      out.push({ kind: "text", text: openMatch[0] + afterOpen });
      break;
    }
    const inner = afterOpen.slice(0, closeIdx);
    out.push({ kind: "cloze", concept, text: inner });
    remaining = afterOpen.slice(closeIdx + CLOSE_TAG.length);
  }

  const collapsed: TextNode[] = [];
  for (const n of out) {
    const last = collapsed[collapsed.length - 1];
    if (n.kind === "text" && last && last.kind === "text") {
      last.text += n.text;
    } else {
      collapsed.push(n);
    }
  }
  return collapsed;
}

export function countClozeBlanks(input: string): number {
  return parseClozeText(input).filter((n) => n.kind === "cloze").length;
}

/** Tiny pill that summarises how many cloze blanks live in a piece of text.
 *  Useful in headers/badges. Kept here to keep cloze parsing in one module. */
export function ClozeBadge({ text }: { text: string }) {
  const count = countClozeBlanks(text);
  if (count === 0) return null;
  return (
    <span className="text-xs rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 font-medium ring-1 ring-indigo-200 dark:ring-indigo-900">
      {count} blank{count === 1 ? "" : "s"}
    </span>
  );
}
