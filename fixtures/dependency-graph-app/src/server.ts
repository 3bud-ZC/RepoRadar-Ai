import type { Express } from "express";
import { chunk } from "lodash";
import { healthRoute } from "./routes/health";
import { userRoute } from "./routes/users";
import { logInfo } from "./lib/logger";

export function startServer(app: Express) {
  logInfo(String(chunk([1, 2, 3], 1).length));
  app.get("/health", healthRoute);
  app.get("/users", userRoute);
}
