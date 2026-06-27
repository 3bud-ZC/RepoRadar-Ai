import express from "express";
import router from "./routes";

const app = express();

app.get("/health", (_request, response) => {
  response.json({ ok: true });
});

app.post("/users", (_request, response) => {
  response.status(201).json({ ok: true });
});

app.use(router);

export default app;

