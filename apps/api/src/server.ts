import app from "./app.js";
import { AnalysisQueue } from "./modules/analysis/analysis.queue.js";

const PORT = 3000;

AnalysisQueue.start();

app.listen(PORT, () => {
  console.log(`🚀 Project Aegis API running on http://localhost:${PORT}`);
});