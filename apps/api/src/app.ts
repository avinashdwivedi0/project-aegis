import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { errorMiddleware } from "./middleware/error.middleware";

import routes from "./routes";

const app = express();


app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use("/api", routes);
app.use(errorMiddleware);

export default app;