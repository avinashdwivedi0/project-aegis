import test from "node:test";
import assert from "node:assert/strict";

import { RetrievalService } from "./retrieval.service";
import { ExplorerService } from "../../repositories/explorer.service";

const originalGetRepositoryFiles = ExplorerService.getRepositoryFiles;

test("indexRepository returns a partial result instead of throwing when embedding generation hits quota limits", async () => {
  ExplorerService.getRepositoryFiles = async () => [
    {
      id: "file-1",
      repositoryId: "repo-1",
      name: "sample.ts",
      path: "src/sample.ts",
      type: "file",
      parentPath: "src",
      content: "const message = 'hello';\nconsole.log(message);",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ] as any;

  const service = new RetrievalService();
  (service as any).vectorService = {
    deleteRepository: async () => {},
    storeMany: async () => {},
  };
  (service as any).embeddingsService = {
    generateEmbeddings: async () => {
      throw new Error("429 RESOURCE_EXHAUSTED: quota exceeded");
    },
  };

  const result = await service.indexRepository("repo-1");

  assert.equal(result.repositoryId, "repo-1");
  assert.equal(result.storedVectors, 0);
  assert.equal(result.indexedChunks, 0);
  assert.equal(result.status, "partial");
  assert.match(String(result.error ?? ""), /embedding provider|could not complete/i);

  ExplorerService.getRepositoryFiles = originalGetRepositoryFiles;
});

test("EmbeddingsService parses Ollama single-query responses with the actual embeddings payload", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      model: "nomic-embed-text",
      embeddings: [[0.1, 0.2, 0.3]],
    }),
  }) as any;

  try {
    const { EmbeddingsService } = await import("../embeddings/embeddings.service");
    const service = new EmbeddingsService();

    const result = await service.generateEmbedding("Explain the overall architecture.");

    assert.deepEqual(result, [0.1, 0.2, 0.3]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
