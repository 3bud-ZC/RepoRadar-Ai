import { logInfo } from "../lib/logger";

export function healthRoute() {
  return logInfo("healthy");
}
