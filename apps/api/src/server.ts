import app from "./app";
import { AnalysisQueue } from "./modules/analysis/analysis.queue";

const PORT = 3000;

AnalysisQueue.start();

app.listen(PORT, () => {
  console.log(`🚀 Project Aegis API running on http://localhost:${PORT}`);
});