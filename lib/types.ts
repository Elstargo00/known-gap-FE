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
}

export interface AskResponse {
  answer: string;
  sources: AskSource[];
  mode: AskMode;
  known_concepts: Concept[];
  unknown_concepts: Concept[];
}

export interface IngestResponse {
  document_id: string;
  filename: string;
  chunk_count: number;
}
