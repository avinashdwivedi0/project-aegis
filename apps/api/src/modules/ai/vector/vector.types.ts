export interface StoreVectorInput {
  repositoryId: string;
  filePath: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
}

export interface StoredVector
  extends StoreVectorInput {
  id: string;
}

export interface SearchOptions {
  repositoryId: string;
  embedding: number[];
  limit?: number;
}

export interface SearchResult {
  score: number;
  vector: StoredVector;
}