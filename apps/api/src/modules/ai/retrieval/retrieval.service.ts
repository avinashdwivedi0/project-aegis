import { ExplorerService } from "../../repositories/explorer.service";

import { ChunkingService } from "../chunking/chunking.service";
import { EmbeddingsService } from "../embeddings/embeddings.service";
import { VectorService } from "../vector/vector.service";

import type {
  IndexRepositoryResult,
  SearchRequest,
  SearchResult,
} from "./retrieval.types";

export class RetrievalService {
  private static readonly MAX_EMBEDDING_CHUNKS =
    80;

  private static readonly MAX_CHUNKS_PER_FILE =
    4;

  private readonly chunkingService =
    new ChunkingService();

  private readonly embeddingsService =
    new EmbeddingsService();

  private readonly vectorService =
    new VectorService();

  private isProviderFailure(
    error: unknown,
  ): boolean {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    return /RESOURCE_EXHAUSTED|quota|rate limit|429|billing|invalid_api_key|model_not_found|does not exist|not found|GROQ_API_KEY|GROQ_CHAT_MODEL|EMBEDDING_PROVIDER|EMBEDDING_MODEL|OLLAMA_BASE_URL|Ollama|AI provider/i.test(
      message,
    );
  }

  public async indexRepository(
    repositoryId: string,
  ): Promise<IndexRepositoryResult> {
    const startedAt = Date.now();

    try {
      const files =
        await ExplorerService.getRepositoryFiles(
          repositoryId,
        );

      const vectors: Parameters<
        VectorService["storeMany"]
      >[0] = [];

      let indexedChunks = 0;

      for (const file of files) {
        const remainingChunks =
          RetrievalService.MAX_EMBEDDING_CHUNKS -
          indexedChunks;

        if (remainingChunks <= 0) {
          break;
        }

        const chunks = this.chunkingService
          .chunkText(file.content)
          .slice(
            0,
            Math.min(
              remainingChunks,
              RetrievalService.MAX_CHUNKS_PER_FILE,
            ),
          );

        if (chunks.length === 0) {
          continue;
        }

        const contents = chunks.map(
          (chunk) => chunk.content,
        );

        const embeddings =
          await this.embeddingsService.generateEmbeddings(
            contents,
          );

        for (
          let i = 0;
          i < chunks.length;
          i++
        ) {
          vectors.push({
            repositoryId,
            filePath: file.path,
            chunkIndex:
              chunks[i].index,
            content:
              chunks[i].content,
            embedding:
              embeddings[i],
          });
        }

        indexedChunks +=
          chunks.length;
      }

      await this.vectorService.deleteRepository(
        repositoryId,
      );
      await this.vectorService.storeMany(
        vectors,
      );

      return {
        repositoryId,
        indexedFiles:
          files.length,
        indexedChunks,
        storedVectors:
          vectors.length,
        durationMs:
          Date.now() -
          startedAt,
        status: "complete",
      };
    } catch (error) {
      if (this.isProviderFailure(error)) {
        return {
          repositoryId,
          indexedFiles: 0,
          indexedChunks: 0,
          storedVectors: 0,
          durationMs:
            Date.now() -
            startedAt,
          status: "partial",
          error:
            "Semantic indexing could not complete because the embedding provider is unavailable or misconfigured.",
        };
      }

      throw error;
    }
  }

  public async search(
    request: SearchRequest,
  ): Promise<SearchResult[]> {
    const embedding =
      await this.embeddingsService.generateEmbedding(
        request.query,
      );

    const results =
      await this.vectorService.search({
        repositoryId:
          request.repositoryId,
        query: request.query,
        embedding,
        limit:
          request.limit ?? 5,
      });

    return results.map(
      (result) => ({
        filePath:
          result.vector.filePath,
        chunkIndex:
          result.vector.chunkIndex,
        content:
          result.vector.content,
        score: result.score,
      }),
    );
  }
}

export const retrievalService =
  new RetrievalService();