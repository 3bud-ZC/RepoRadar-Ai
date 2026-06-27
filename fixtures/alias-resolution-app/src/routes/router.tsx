import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/app/AppShell";

export const routes = createBrowserRouter([
  { path: "/", element: AppShell() },
  { path: "/settings", element: AppShell() }
]);
