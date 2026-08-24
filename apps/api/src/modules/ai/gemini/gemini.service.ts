import { GoogleGenAI } from "@google/genai";

import { aiConfig } from "../../../config/ai.config";

export class GeminiService {
  private readonly client: GoogleGenAI;

  constructor() {
    if (!aiConfig.apiKey) {
      throw new Error("GEMINI_API_KEY is missing.");
    }

    this.client = new GoogleGenAI({
      apiKey: aiConfig.apiKey,
    });
  }

  async generateText(
    prompt: string,
  ): Promise<string> {
    const response =
      await this.client.models.generateContent({
        model: aiConfig.chatModel,
        contents: prompt,
        config: {
          temperature: aiConfig.temperature,
        },
      });

    return response.text ?? "";
  }

  async generateEmbedding(
    text: string,
  ): Promise<number[]> {
    const response =
      await this.client.models.embedContent({
        model: aiConfig.embeddingModel,
        contents: text,
        config: {
          outputDimensionality: 768,
        },
      });

    const vector =
      response.embeddings?.[0]?.values;

    if (!vector) {
      throw new Error(
        "Failed to generate embedding.",
      );
    }

    return vector;
  }

  async generateEmbeddings(
    texts: string[],
  ): Promise<number[][]> {
    const cleaned = texts
      .map((text) => text.trim())
      .filter((text) => text.length > 0);

    if (cleaned.length === 0) {
      return [];
    }

    const response =
      await this.client.models.embedContent({
        model: aiConfig.embeddingModel,
        contents: cleaned,
        config: {
          outputDimensionality: 768,
        },
      });

    const embeddings = response.embeddings
      ?.map((embedding) => embedding.values)
      .filter(
        (embedding): embedding is number[] =>
          Boolean(embedding),
      );

    if (!embeddings || embeddings.length !== cleaned.length) {
      throw new Error(
        "Gemini returned an incomplete embedding batch.",
      );
    }

    return embeddings;
  }
}

export const geminiService =
  new GeminiService();