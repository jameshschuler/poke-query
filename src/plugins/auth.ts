import fp from "fastify-plugin";
import { type FastifyPluginAsync } from "fastify";
import { supabase } from "../lib/supabase.js";

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate("authenticate", async (request, reply) => {
    const token = request.cookies["sb-access-token"];

    if (!token) return reply.code(401).send({ error: "Unauthorized" });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) return reply.code(401).send({ error: "Invalid Session" });

    request.user = user;
  });
};

export default fp(authPlugin);
