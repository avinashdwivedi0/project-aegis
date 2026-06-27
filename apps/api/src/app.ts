import express from "express";
import cors from "cors";
import helmet from "helmet";

import indexRouter from "./routes";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/", indexRouter);

export default app;