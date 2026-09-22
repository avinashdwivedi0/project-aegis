import dotenv from "dotenv";

dotenv.config();

export const aiConfig = {
  apiKey: (process.env.GROQ_API_KEY ?? "").trim(),

  chatModel:
    (process.env.GROQ_CHAT_MODEL ?? "openai/gpt-oss-120b").trim(),

  embeddingProvider:
    (process.env.EMBEDDING_PROVIDER ?? "ollama").trim().toLowerCase(),

  embeddingModel:
    (process.env.EMBEDDING_MODEL ?? "nomic-embed-text").trim(),

  ollamaBaseUrl:
    (process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434").trim(),

  retrievalLimit: 5,

  temperature: 0.2,
} as const;