import { Router } from "express";

const router = Router();

router.get("/reports", (_request, response) => {
  response.json([]);
});

export default router;

