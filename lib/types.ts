export type AskMode = "normal" | "learning" | "concise";

export interface AskSource {
  chunk_id: string;
  document_id: string;
  filename: string;
  content_preview: string;
  similarity_score: number;
}

export interface Concept {
  canonical_name: string;
  display_name: string;
  /**
   * Per-user familiarity in [0, 100]. 0 means brand new to the user's graph,
   * 100 means fully mastered. The backend updates this score every time a
   * concept is re-asked or re-introduced in an answer; learning-mode cloze
   * masking kicks in for concepts above the configured threshold.
   */
  known_score: number;
}

export interface AskResponse {
  answer: string;
  sources: AskSource[];
  mode: AskMode;
  known_concepts: Concept[];
  unknown_concepts: Concept[];
  /**
   * Canonical names of concepts the backend masked as `<cloze>` blanks in
   * `answer` (learning mode only). Empty for normal/concise modes.
   */
  cloze_concepts: string[];
}

export interface IngestResponse {
  document_id: string;
  filename: string;
  chunk_count: number;
}
