import { logInfo } from "../lib/logger";
import { formatUsers } from "../shared/formatter";

export function listUsers() {
  logInfo("service");
  return formatUsers(["Ada"]);
}
