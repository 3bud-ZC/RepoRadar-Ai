import express from "express";

const app = express();
app.get("/users", (_req, res) => res.json([{ id: 1 }]));

export default app;
