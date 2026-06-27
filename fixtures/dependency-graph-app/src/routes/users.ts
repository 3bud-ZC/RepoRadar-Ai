import { logInfo } from "../lib/logger";
import { listUsers } from "../services/userService";

export function userRoute() {
  logInfo("users");
  return listUsers();
}
