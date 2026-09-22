import { prisma } from './src/config/prisma';
import { ImportService } from './src/modules/repositories/import.service';

async function main() {
  const user = await prisma.user.create({
    data: { name: 'repro', email: 'repro-' + Date.now() + '@example.test', passwordHash: 'x' }
  });
  const project = await prisma.project.create({ data: { name: 'repro', ownerId: user.id } });
  const repo = await prisma.repository.create({ data: { name: 'repo', projectId: project.id } });

  try {
    const result = await ImportService.importFromGitHub(repo.id, 'https://github.com/facebook/react');
    console.log('RESULT', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('IMPORT_ERROR');
    console.error(error instanceof Error ? error.stack : String(error));
    process.exitCode = 1;
  } finally {
    await prisma.repository.deleteMany({ where: { projectId: project.id } });
    await prisma.project.delete({ where: { id: project.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('UNHANDLED', error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
