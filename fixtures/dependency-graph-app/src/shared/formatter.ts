import { listUsers } from "../services/userService";

export function formatUsers(users: string[]) {
  return users.join(",") + String(listUsers.name.length);
}
