import { apiClient } from "lib/client";
import { UserSchema } from "@models/user";
import { formatName } from "src/utils/format";

export function AppShell(): string {
  return `${apiClient.basePath}:${formatName(Object.keys(UserSchema.shape).join(","))}`;
}
