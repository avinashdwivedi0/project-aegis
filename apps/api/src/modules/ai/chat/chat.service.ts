import type {
  ChatRequest,
  ChatResponse,
} from "./chat.types";

import { retrievalService } from "../retrieval/retrieval.service";
import { groqService } from "../gemini/gemini.service";
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

  private static readonly AI_UNAVAILABLE_MESSAGE =
    "AI chat is currently unavailable because the configured AI provider is misconfigured or inaccessible. Check the Groq API key and model settings.";

  private static isCasualMessage(message: string): boolean {
    return /^(hi|hello|hey|good morning|good afternoon|good evening)[!.?\s]*$/i.test(
      message.trim(),
    );
  }

  public async chat(
    request: ChatRequest,
  ): Promise<ChatResponse> {
    const isCasualMessage =
      ChatService.isCasualMessage(request.message);

    let results = [] as Awaited<
      ReturnType<typeof retrievalService.search>
    >;

    if (!isCasualMessage) {
      try {
        results = await retrievalService.search({
          repositoryId: request.repositoryId,
          query: request.message,
          limit: aiConfig.retrievalLimit,
        });
      } catch (error) {
        console.warn(
          "Chat retrieval failed; continuing without repository context.",
          error,
        );
      }
    }

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

    const prompt = isCasualMessage
      ? `
You are Project Aegis AI. Respond briefly and naturally to this casual greeting.
Do not claim repository information is missing because no repository context is needed.

User Message:
${request.message}

Answer:
`.trim()
      : `
${ChatService.SYSTEM_PROMPT}

Repository Context:

${context}

User Question:
${request.message}

Answer:
`.trim();

    if (process.env.NODE_ENV !== "production") {
      console.info(
        "RAG Context",
        JSON.stringify({
          repositoryId: request.repositoryId,
          query: request.message,
          retrievedChunks: results.length,
          contextCharacters: context.length,
          promptCharacters: prompt.length,
        }),
      );
    }

    let answer = ChatService.AI_UNAVAILABLE_MESSAGE;

    try {
      answer = await groqService.generateText(prompt);
    } catch (error) {
      console.warn(
        "Chat generation failed; returning provider-unavailable message.",
        error,
      );
    }

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