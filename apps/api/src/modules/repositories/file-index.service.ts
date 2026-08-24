import { prisma } from "../../config/prisma";

import { FileNode } from "./file-scanner.service";

type RepositoryFileRecord = {
  repositoryId: string;
  name: string;
  path: string;
  type: string;
  parentPath: string | null;
};

export class FileIndexService {
  static async index(
    repositoryId: string,
    nodes: FileNode[],
  ) {
    const records: RepositoryFileRecord[] =
      [];

    const walk = (
      items: FileNode[],
      parentPath: string | null = null,
    ) => {
      for (const item of items) {
        records.push({
          repositoryId,
          name: item.name,
          path: item.path,
          type: item.type,
          parentPath,
        });

        if (item.children?.length) {
          walk(
            item.children,
            item.path,
          );
        }
      }
    };

    walk(nodes);

    await prisma.$transaction(
      async (tx) => {
        await tx.repositoryFile.deleteMany({
          where: {
            repositoryId,
          },
        });

        if (records.length > 0) {
          await tx.repositoryFile.createMany({
            data: records,
            skipDuplicates: true,
          });
        }
      },
    );

    return records.length;
  }
}