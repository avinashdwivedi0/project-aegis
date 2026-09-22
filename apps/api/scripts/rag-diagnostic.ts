import { prisma } from "../src/config/prisma";
import { embeddingsService } from "../src/modules/ai/embeddings/embeddings.service";
import { retrievalService } from "../src/modules/ai/retrieval/retrieval.service";

const queries = [
  "Explain the overall architecture of this repository and how its main modules work together.",
  "What does backend/index.js do?",
  "What dependencies are defined in backend/package.json?",
  "Explain the purpose of the main entry point of this repository.",
];

const repository = await prisma.repository.findFirst({
  orderBy: {
    createdAt: "asc",
  },
});

if (!repository) {
  throw new Error("No repository found.");
}

const files = await prisma.repositoryFile.findMany({
  where: {
    repositoryId: repository.id,
    type: "file",
  },
  select: {
    path: true,
  },
});

const embeddingCount = await prisma.repositoryEmbedding.count({
  where: {
    repositoryId: repository.id,
  },
});

const embeddingFiles = await prisma.repositoryEmbedding.groupBy({
  by: ["filePath"],
  where: {
    repositoryId: repository.id,
  },
  _count: {
    _all: true,
  },
});

console.log(
  JSON.stringify(
    {
      repository: {
        id: repository.id,
        name: repository.name,
        status: repository.status,
      },
      fileCount: files.length,
      embeddingCount,
      embeddingFileCount: embeddingFiles.length,
      fileCategories: {
        source: files.filter((file) => /\.(ts|tsx|js|jsx|java|py|go|rs|cs)$/i.test(file.path)).length,
        configuration: files.filter((file) => /(^|\/)(package\.json|tsconfig|\.env|.*\.ya?ml|.*\.prisma)$/i.test(file.path)).length,
        documentation: files.filter((file) => /\.(md|mdx|txt)$/i.test(file.path)).length,
        lockfiles: files.filter((file) => /(package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/i.test(file.path)).length,
      },
      lockfileEmbeddings: embeddingFiles
        .filter((file) => /(package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/i.test(file.filePath))
        .map((file) => ({ filePath: file.filePath, chunks: file._count._all })),
    },
    null,
    2,
  ),
);

for (const query of queries) {
  const queryEmbedding = await embeddingsService.generateEmbedding(query);
  const results = await retrievalService.search({
    repositoryId: repository.id,
    query,
    limit: 5,
  });

  console.log(
    JSON.stringify(
      {
        query,
        queryEmbeddingDimension: queryEmbedding.length,
        retrievedCount: results.length,
        results: results.map((result) => ({
          filePath: result.filePath,
          chunkIndex: result.chunkIndex,
          similarity: result.score,
          contentPreview: result.content.slice(0, 120),
        })),
      },
      null,
      2,
    ),
  );
}

await prisma.$disconnect();