CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "repository_embeddings" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "repositoryFileId" TEXT,
    "filePath" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(768) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repository_embeddings_pkey"
    PRIMARY KEY ("id")
);

CREATE INDEX
"repository_embeddings_repositoryId_idx"
ON "repository_embeddings"(
    "repositoryId"
);

CREATE INDEX
"repository_embeddings_repositoryFileId_idx"
ON "repository_embeddings"(
    "repositoryFileId"
);

CREATE INDEX
"repository_embeddings_filePath_idx"
ON "repository_embeddings"(
    "filePath"
);

CREATE INDEX
"repository_embeddings_embedding_idx"
ON "repository_embeddings"
USING ivfflat (
    "embedding" vector_cosine_ops
)
WITH (lists = 100);

ALTER TABLE "repository_embeddings"
ADD CONSTRAINT
"repository_embeddings_repositoryId_fkey"
FOREIGN KEY ("repositoryId")
REFERENCES "repositories"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "repository_embeddings"
ADD CONSTRAINT
"repository_embeddings_repositoryFileId_fkey"
FOREIGN KEY ("repositoryFileId")
REFERENCES "repository_files"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;