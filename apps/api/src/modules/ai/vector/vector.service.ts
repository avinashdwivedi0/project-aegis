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

    const rows =
      await prisma.$queryRawUnsafe<
        {
          id: string;
          repositoryId: string;
          filePath: string;
          chunkIndex: number;
          content: string;
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
          1 - (embedding <=> $1::vector) AS score
        FROM repository_embeddings
        WHERE "repositoryId" = $2
        ORDER BY embedding <=> $1::vector
        LIMIT $3
        `,
        embedding,
        options.repositoryId,
        options.limit ?? 5,
      );

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