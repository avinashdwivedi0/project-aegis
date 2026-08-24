export type ChatRole =
  | "user"
  | "assistant";

export type ChatMessageStatus =
  | "pending"
  | "streaming"
  | "completed"
  | "failed";

export interface ChatSource {
  filePath: string;
  chunkIndex: number;
  score: number;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  status: ChatMessageStatus;
  sources: ChatSource[];
}

export interface SendChatMessageInput {
  repositoryId: string;
  message: string;
  signal?: AbortSignal;
}

export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
}