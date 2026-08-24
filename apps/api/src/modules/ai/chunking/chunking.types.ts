export interface ChunkOptions {
  chunkSize?: number;
  chunkOverlap?: number;
}

export interface TextChunk {
  index: number;
  content: string;
  start: number;
  end: number;
}