export const aiConfig = {
  apiKey: process.env.GEMINI_API_KEY ?? "",

  chatModel:
    process.env.GEMINI_CHAT_MODEL ??
    "gemini-3.6-flash",

  embeddingModel:
    process.env.GEMINI_EMBED_MODEL ??
    "gemini-embedding-001",

  retrievalLimit: 5,

  temperature: 0.2,
} as const;