export interface ChatRequest {
  repositoryId: string;
  message: string;
}

export interface ChatSource {
  filePath: string;
  chunkIndex: number;
  score: number;
}

export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
}