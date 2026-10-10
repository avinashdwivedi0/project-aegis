import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const distributionRoot = path.resolve(scriptDirectory, "../dist");
const port = Number(process.env.DIST_PORT ?? 5190);
const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"], [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"], [".svg", "image/svg+xml"], [".json", "application/json; charset=utf-8"],
  [".woff2", "font/woff2"], [".png", "image/png"], [".ico", "image/x-icon"],
]);

const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
    const requested = path.resolve(distributionRoot, `.${pathname}`);
    if (requested !== distributionRoot && !requested.startsWith(`${distributionRoot}${path.sep}`)) {
      response.writeHead(400).end("Bad path");
      return;
    }
    let filePath = requested;
    try { await access(filePath); } catch { filePath = path.join(distributionRoot, "index.html"); }
    if (!(await stat(filePath)).isFile()) filePath = path.join(distributionRoot, "index.html");
    response.writeHead(200, { "content-type": contentTypes.get(path.extname(filePath)) ?? "application/octet-stream" });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(500).end("Unable to serve built app");
  }
});
server.listen(port, "0.0.0.0", () => process.stdout.write(`Production dist listening on http://localhost:${port}\n`));
