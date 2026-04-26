import { Fragment, type ReactNode } from "react";

/**
 * Parse a string that may contain <known concept="canonical-name">text</known>
 * inline tags and render a mix of plain spans and "known" spans. Never uses
 * dangerouslySetInnerHTML.
 *
 * - Only the exact <known concept="..."> tag shape is parsed; all other angle
 *   brackets are treated as literal text.
 * - Unknown / malformed / unclosed tags degrade gracefully to plain text.
 * - `dimKnown` toggles the visual treatment so the same component can be used
 *   to render concept pills (highlighting the "known" styling without dimming).
 */
export function KnownText({
  text,
  dimKnown = true,
}: {
  text: string;
  dimKnown?: boolean;
}) {
  const nodes = parseKnownText(text);
  return (
    <>
      {nodes.map((node, i) => {
        if (node.kind === "text") {
          return <Fragment key={i}>{node.text}</Fragment>;
        }
        return (
          <KnownSpan key={i} concept={node.concept} dim={dimKnown}>
            {node.text}
          </KnownSpan>
        );
      })}
    </>
  );
}

function KnownSpan({
  concept,
  dim,
  children,
}: {
  concept: string;
  dim: boolean;
  children: ReactNode;
}) {
  if (!dim) {
    // Pill-friendly rendering: subtle styling without blur.
    return (
      <span
        title={`Known concept: ${concept}`}
        className="rounded bg-zinc-200/80 dark:bg-zinc-700/60 px-1 text-zinc-600 dark:text-zinc-300"
      >
        {children}
      </span>
    );
  }
  return (
    <span
      title={`You already know: ${concept}`}
      className="rounded bg-black px-1 font-bold text-black cursor-help transition-colors hover:bg-transparent hover:text-zinc-900 dark:hover:text-zinc-100"
    >
      {children}
    </span>
  );
}

type TextNode =
  | { kind: "text"; text: string }
  | { kind: "known"; concept: string; text: string };

const OPEN_RE = /<known\s+concept\s*=\s*"([^"]*)"\s*>/i;
const CLOSE_TAG = "</known>";

export function parseKnownText(input: string): TextNode[] {
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
      // No closer; treat the whole open tag as literal text and stop parsing
      // further tags (safer than recursing infinitely).
      out.push({ kind: "text", text: openMatch[0] + afterOpen });
      break;
    }
    const inner = afterOpen.slice(0, closeIdx);
    out.push({ kind: "known", concept, text: inner });
    remaining = afterOpen.slice(closeIdx + CLOSE_TAG.length);
  }

  // Collapse consecutive text nodes for cleanliness.
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
