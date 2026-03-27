import fp from "fastify-plugin";
import { db } from "../db/index.js";

export default fp(async (fastify) => {
  // This makes 'db' available on the fastify instance
  fastify.decorate("db", db);

  // Optional: Close connection on server shutdown
  fastify.addHook("onClose", async () => {
    // queryClient.end() if needed, depending on your driver
  });
});
