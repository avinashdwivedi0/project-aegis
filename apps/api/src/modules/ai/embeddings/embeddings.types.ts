export interface EmbeddingProvider {
  generateEmbedding(
    text: string,
  ): Promise<number[]>;

  generateEmbeddings(
    texts: string[],
  ): Promise<number[][]>;
}

export interface EmbeddingRequest {
  text: string;
}

export interface BatchEmbeddingRequest {
  texts: string[];
}

export interface EmbeddingResponse {
  embedding: number[];
}

export interface BatchEmbeddingResponse {
  embeddings: number[][];
}