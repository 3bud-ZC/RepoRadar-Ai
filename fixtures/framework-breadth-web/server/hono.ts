import { Hono } from "hono";

const app = new Hono();

app.get("/api/hono", () => "ok");

export { app };
