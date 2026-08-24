import {
  ChunkOptions,
  TextChunk,
} from "./chunking.types";

export class ChunkingService {
  private static readonly DEFAULT_CHUNK_SIZE =
    1200;

  private static readonly DEFAULT_CHUNK_OVERLAP =
    200;

  private static readonly BREAK_CHARACTERS = [
    "\n\n",
    "\n",
    ". ",
    "; ",
    ", ",
    " ",
  ];

  public chunkText(
    text: string,
    options: ChunkOptions = {},
  ): TextChunk[] {
    if (!text.trim()) {
      return [];
    }

    const chunkSize =
      options.chunkSize ??
      ChunkingService.DEFAULT_CHUNK_SIZE;

    const chunkOverlap =
      options.chunkOverlap ??
      ChunkingService.DEFAULT_CHUNK_OVERLAP;

    const chunks: TextChunk[] = [];

    let start = 0;
    let index = 0;

    while (start < text.length) {
      let end = Math.min(
        start + chunkSize,
        text.length,
      );

      if (end < text.length) {
        end = this.findBestBreak(
          text,
          start,
          end,
        );
      }

      const content = text
        .slice(start, end)
        .trim();

      if (content.length > 0) {
        chunks.push({
          index: index++,
          content,
          start,
          end,
        });
      }

      if (end >= text.length) {
        break;
      }

      start = Math.max(
        0,
        end - chunkOverlap,
      );
    }

    return chunks;
  }

  private findBestBreak(
    text: string,
    start: number,
    preferredEnd: number,
  ): number {
    const min = Math.max(
      start,
      preferredEnd - 200,
    );

    for (const separator of ChunkingService.BREAK_CHARACTERS) {
      const position =
        text.lastIndexOf(
          separator,
          preferredEnd,
        );

      if (position >= min) {
        return (
          position +
          separator.length
        );
      }
    }

    return preferredEnd;
  }
}