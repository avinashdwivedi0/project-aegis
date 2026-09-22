import { prisma } from "../src/config/prisma";
import { retrievalService } from "../src/modules/ai/retrieval/retrieval.service";

const repository = await prisma.repository.findFirst({
  orderBy: {
    createdAt: "asc",
  },
});

if (!repository) {
  throw new Error("No repository found.");
}

const result = await retrievalService.indexRepository(
  repository.id,
);

console.log(JSON.stringify(result, null, 2));
await prisma.$disconnect();