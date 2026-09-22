import crypto from "crypto";

import { prisma } from "../../../config/prisma";

import type {
  SearchOptions,
  SearchResult,
  StoredVector,
  StoreVectorInput,
} from "./vector.types";

export class VectorService {
  public async store(
    input: StoreVectorInput,
  ): Promise<StoredVector> {
    await this.storeMany([input]);

    return {
      id: this.createId(input),
      ...input,
    };
  }

  public async storeMany(
    inputs: StoreVectorInput[],
  ): Promise<void> {
    if (inputs.length === 0) {
      return;
    }

    const values = inputs.map((input) => ({
      id: this.createId(input),
      repositoryId:
        input.repositoryId,
      filePath: input.filePath,
      chunkIndex:
        input.chunkIndex,
      content: input.content,
      embedding: `[${input.embedding.join(",")}]`,
    }));

    await prisma.$transaction(
      values.map((value) =>
        prisma.$executeRawUnsafe(
          `
          INSERT INTO repository_embeddings (
            id,
            "repositoryId",
            "filePath",
            "chunkIndex",
            content,
            embedding,
            "createdAt",
            "updatedAt"
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6::vector,
            NOW(),
            NOW()
          )
          ON CONFLICT (id)
          DO UPDATE SET
            content = EXCLUDED.content,
            embedding = EXCLUDED.embedding,
            "updatedAt" = NOW()
          `,
          value.id,
          value.repositoryId,
          value.filePath,
          value.chunkIndex,
          value.content,
          value.embedding,
        ),
      ),
    );
  }

  public async search(
    options: SearchOptions,
  ): Promise<SearchResult[]> {
    const embedding = `[${options.embedding.join(",")}]`;

    const candidateRows =
      await prisma.$queryRawUnsafe<
        {
          id: string;
          repositoryId: string;
          filePath: string;
          chunkIndex: number;
          content: string;
          distance: number;
          score: number;
        }[]
      >(
        `
        SELECT
          id,
          "repositoryId",
          "filePath",
          "chunkIndex",
          content,
          embedding <=> $1::vector AS distance,
          1 - (embedding <=> $1::vector) AS score
        FROM repository_embeddings
        WHERE "repositoryId" = $2
        ORDER BY embedding <=> $1::vector
        LIMIT $3
        `,
        embedding,
        options.repositoryId,
        80,
      );

    const query = options.query?.toLowerCase() ?? "";
    const isArchitectureQuery =
      /architecture|main modules?|how .* work together|overall structure|entry point/i.test(
        query,
      );
    const normalizedQuery = query.replaceAll("\\", "/");

    const rankedRows = [...candidateRows].sort((left, right) => {
      const score = (row: (typeof candidateRows)[number]) => {
        const filePath = row.filePath.toLowerCase().replaceAll("\\", "/");
        const exactPathMatch =
          normalizedQuery.includes(filePath) ||
          normalizedQuery.includes(filePath.replaceAll("/", "\\"));
        const metadataPenalty =
          isArchitectureQuery &&
          /(package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/i.test(filePath)
            ? 0.12
            : 0;

        return row.score + (exactPathMatch ? 1 : 0) - metadataPenalty;
      };

      return score(right) - score(left);
    });

    const rows = rankedRows.filter(
      (row, index, candidates) =>
        candidates.findIndex(
          (candidate) =>
            candidate.filePath === row.filePath,
        ) === index,
    ).slice(0, options.limit ?? 5);

    if (process.env.NODE_ENV !== "production") {
      const candidateCount = await prisma.repositoryEmbedding.count({
        where: {
          repositoryId: options.repositoryId,
        },
      });

      console.info(
        "RAG Retrieval",
        JSON.stringify({
          repositoryId: options.repositoryId,
          queryEmbeddingDimension: options.embedding.length,
          candidateCount,
          candidateRows: candidateRows.length,
          retrievedCount: rows.length,
          topResults: rows.map((row) => ({
            filePath: row.filePath,
            chunkIndex: row.chunkIndex,
            distance: row.distance,
            similarity: row.score,
          })),
        }),
      );
    }

    return rows.map((row) => ({
      score: row.score,
      vector: {
        id: row.id,
        repositoryId:
          row.repositoryId,
        filePath: row.filePath,
        chunkIndex:
          row.chunkIndex,
        content: row.content,
        embedding: [],
      },
    }));
  }

  public async deleteRepository(
    repositoryId: string,
  ): Promise<void> {
    await prisma.repositoryEmbedding.deleteMany({
      where: {
        repositoryId,
      },
    });
  }

  public async clear(): Promise<void> {
    await prisma.repositoryEmbedding.deleteMany();
  }

  public async count(): Promise<number> {
    return prisma.repositoryEmbedding.count();
  }

  private createId(
    input: StoreVectorInput,
  ): string {
    return crypto
      .createHash("sha256")
      .update(
        `${input.repositoryId}:${input.filePath}:${input.chunkIndex}`,
      )
      .digest("hex");
  }
}