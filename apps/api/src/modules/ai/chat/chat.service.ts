import type {
  ChatRequest,
  ChatResponse,
} from "./chat.types";

import { retrievalService } from "../retrieval/retrieval.service";
import { geminiService } from "../gemini/gemini.service";
import { aiConfig } from "../../../config/ai.config";

export class ChatService {
  private static readonly SYSTEM_PROMPT = `
You are Project Aegis AI, an expert software engineering assistant.

Rules:
- Answer ONLY using the provided repository context.
- Never invent code, APIs, files, or classes.
- If the answer cannot be found in the context, reply exactly:
"I couldn't find that information in the indexed repository."

When possible:
- Mention relevant file paths.
- Explain code behavior clearly.
- Keep responses concise.
`.trim();

  public async chat(
    request: ChatRequest,
  ): Promise<ChatResponse> {
    const results =
      await retrievalService.search({
        repositoryId: request.repositoryId,
        query: request.message,
        limit: aiConfig.retrievalLimit,
      });

    const context =
      results.length === 0
        ? "No repository context available."
        : results
            .map(
              (chunk) => `File: ${chunk.filePath}

${chunk.content}`,
            )
            .join(
              "\n\n----------------------------------------\n\n",
            );

    const prompt = `
${ChatService.SYSTEM_PROMPT}

Repository Context:

${context}

User Question:
${request.message}

Answer:
`.trim();

    const answer =
      await geminiService.generateText(prompt);

    return {
      answer: answer.trim(),
      sources: results.map((chunk) => ({
        filePath: chunk.filePath,
        chunkIndex: chunk.chunkIndex,
        score: chunk.score,
      })),
    };
  }
}

export const chatService =
  new ChatService();