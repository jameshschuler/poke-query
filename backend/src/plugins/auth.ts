import fp from "fastify-plugin";
import { type FastifyPluginAsync } from "fastify";
import { supabase } from "../lib/supabase.js";

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate("authenticate", async (request, reply) => {
    const cookieToken = request.cookies["sb-access-token"];
    const authHeader = request.headers.authorization;
    const bearerToken =
      typeof authHeader === "string" ? authHeader.match(/^Bearer\s+(.+)$/i)?.[1] : undefined;
    const token = cookieToken ?? bearerToken;

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
