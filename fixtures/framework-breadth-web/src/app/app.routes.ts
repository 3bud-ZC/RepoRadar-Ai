import type { Routes } from "@angular/router";

export const routes: Routes = [
  { path: "", loadComponent: async () => ({}) },
  { path: "reports", loadComponent: async () => ({}) }
];
