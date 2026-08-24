import api from "./api";

import type {
  ChatResponse,
  SendChatMessageInput,
} from "@/types/chat";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export async function sendChatMessage({
  repositoryId,
  message,
  signal,
}: SendChatMessageInput) {
  const response =
    await api.post<ApiResponse<ChatResponse>>(
      "/chat",
      {
        repositoryId,
        message,
      },
      {
        signal,
      },
    );

  return response.data;
}