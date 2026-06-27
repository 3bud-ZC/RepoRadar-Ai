import { AppShell } from "@/app/AppShell";
import { routes } from "~routes/router";
import { apiClient } from "lib/client";
import { UserSchema } from "@models/user";

console.log(AppShell, routes, apiClient, UserSchema);
