import express from "express";

const app = express();
app.get("/users", (_req, res) => res.json([{ id: 1 }]));
app.post("/reports", (_req, res) => res.status(201).json({ ok: true }));

export default app;
