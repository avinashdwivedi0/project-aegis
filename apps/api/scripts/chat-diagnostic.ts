import { prisma } from "../src/config/prisma";
import { chatService } from "../src/modules/ai/chat/chat.service";

const repository = await prisma.repository.findFirst({
  orderBy: {
    createdAt: "asc",
  },
});

if (!repository) {
  throw new Error("No repository found.");
}

const messages = [
  "Explain the overall architecture of this repository and how its main modules work together.",
  "hey",
];

for (const message of messages) {
  const response = await chatService.chat({
    repositoryId: repository.id,
    message,
  });

  console.log(
    JSON.stringify(
      {
        message,
        answer: response.answer,
        sourceCount: response.sources.length,
        sources: response.sources,
      },
      null,
      2,
    ),
  );
}

await prisma.$disconnect();