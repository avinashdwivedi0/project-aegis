export interface IndexRepositoryResult {
  repositoryId: string;
  indexedFiles: number;
  indexedChunks: number;
  storedVectors: number;
  durationMs: number;
  status?: "complete" | "partial";
  error?: string;
}

export interface SearchRequest {
  repositoryId: string;
  query: string;
  limit?: number;
}

export interface SearchResult {
  repositoryId?: string;
  filePath: string;
  chunkIndex: number;
  content: string;
  score: number;
}

export interface VectorRecord {
  repositoryId: string;
  filePath: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
}