import { fileURLToPath } from "url";
import { resolve } from "path";
import express from "express";
import morgan from "morgan";
import cors from "cors";
import mountRoutes from "./routes/index.mjs";

const __filename = fileURLToPath(import.meta.url);
const isMain =
  process.argv[1] && resolve(process.argv[1]) === resolve(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(morgan("dev"));
app.use(cors());
mountRoutes(app);

if (isMain) {
  app.listen(PORT, () => {
    console.log(`Server at http://localhost:${PORT}`);
  });
}

export default app;
