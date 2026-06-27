import { pgTable } from "drizzle-orm/pg-core";
import { z } from "zod";

export const users = pgTable("users", {});
export const UserSchema = z.object({
  id: z.string(),
  email: z.string()
});
