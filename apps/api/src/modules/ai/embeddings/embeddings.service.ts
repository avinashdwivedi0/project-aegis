import { aiConfig } from "../../../config/ai.config";

import type {
  EmbeddingProvider,
} from "./embeddings.types";

export class EmbeddingsService
  implements EmbeddingProvider
{
  private async requestOllamaEmbedding(
    text: string,
  ): Promise<number[]> {
    const response = await fetch(
      `${aiConfig.ollamaBaseUrl}/api/embed`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: aiConfig.embeddingModel,
          input: text,
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Ollama embeddings request failed (${response.status}): ${body.slice(0, 300)}`,
      );
    }

    const payload = (await response.json()) as {
      embedding?: number[];
      embeddings?: number[][];
    };

    const singleVector = Array.isArray(payload.embedding)
      ? payload.embedding
      : Array.isArray(payload.embeddings) && payload.embeddings.length > 0
        ? payload.embeddings[0]
        : undefined;

    if (!Array.isArray(singleVector)) {
      throw new Error(
        "Ollama returned an invalid single embedding payload.",
      );
    }

    return singleVector;
  }

  private async requestOllamaEmbeddings(
    texts: string[],
  ): Promise<number[][]> {
    const response = await fetch(
      `${aiConfig.ollamaBaseUrl}/api/embed`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: aiConfig.embeddingModel,
          input: texts,
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Ollama batch embeddings request failed (${response.status}): ${body.slice(0, 300)}`,
      );
    }

    const payload = (await response.json()) as {
      embeddings?: number[][];
    };

    if (!Array.isArray(payload.embeddings)) {
      throw new Error(
        "Ollama returned an invalid batch embedding payload.",
      );
    }

    return payload.embeddings.map((embedding) => {
      if (!Array.isArray(embedding)) {
        throw new Error(
          "Ollama returned a malformed embedding in the batch response.",
        );
      }

      return embedding;
    });
  }

  public async generateEmbedding(
    text: string,
  ): Promise<number[]> {
    const cleaned = text.trim();

    if (!cleaned) {
      return [];
    }

    return this.requestOllamaEmbedding(cleaned);
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

    const embeddingBatch = await this.requestOllamaEmbeddings(
      cleaned,
    );

    if (embeddingBatch.length === 0) {
      throw new Error(
        "Ollama returned no embeddings for the batch request.",
      );
    }

    return embeddingBatch;
  }
}

export const embeddingsService =
  new EmbeddingsService();