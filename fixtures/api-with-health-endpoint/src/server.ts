import express from "express";

const app = express();
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/users", (_req, res) => res.json([{ id: 1 }]));

export default app;
