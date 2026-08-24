import { geminiService } from "../gemini/gemini.service";

import type {
  EmbeddingProvider,
} from "./embeddings.types";

export class EmbeddingsService
  implements EmbeddingProvider
{
  public async generateEmbedding(
    text: string,
  ): Promise<number[]> {
    const cleaned = text.trim();

    if (!cleaned) {
      return [];
    }

    return geminiService.generateEmbedding(
      cleaned,
    );
  }

  public async generateEmbeddings(
    texts: string[],
  ): Promise<number[][]> {
    const cleaned = texts
      .map((text) => text.trim())
      .filter((text) => text.length > 0);

    if (cleaned.length === 0) {
      return [];
    }

    return geminiService.generateEmbeddings(
      cleaned,
    );
  }
}

export const embeddingsService =
  new EmbeddingsService();