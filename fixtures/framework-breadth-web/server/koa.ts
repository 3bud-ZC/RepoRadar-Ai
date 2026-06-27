import Router from "@koa/router";

const router = new Router();

router.get("/api/koa", () => "ok");

export { router };
