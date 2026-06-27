import Fastify from "fastify";
import { registerPlugins } from "../plugins";
import { UserSchema } from "@models/user";

const fastify = Fastify();

registerPlugins(fastify);

fastify.get("/health", async () => ({ ok: true }));
fastify.route({
  method: "POST",
  url: "/users",
  handler: async () => UserSchema.parse({ id: "1", email: "user@example.com" })
});

export { fastify };
