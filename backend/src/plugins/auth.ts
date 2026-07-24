import fp from "fastify-plugin";
import { type FastifyPluginAsync, type FastifyReply } from "fastify";
import { createSupabaseAuthClient, supabase } from "../lib/supabase.js";

const isProduction = process.env.NODE_ENV === "production";
const accessTokenMaxAgeSeconds = Number(process.env.ACCESS_TOKEN_MAX_AGE_SECONDS ?? 60 * 60);
const refreshTokenMaxAgeSeconds = Number(
  process.env.REFRESH_TOKEN_MAX_AGE_SECONDS ?? 60 * 60 * 24 * 7,
);

async function tryRefreshWithCookie(refreshToken: string | undefined, reply: FastifyReply) {
  if (!refreshToken) {
    return null;
  }

  const authClient = createSupabaseAuthClient();
  const { data, error } = await authClient.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session) {
    return null;
  }

  reply.setCookie("sb-access-token", data.session.access_token, {
    path: "/",
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: accessTokenMaxAgeSeconds,
  });

  reply.setCookie("sb-refresh-token", data.session.refresh_token, {
    path: "/",
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: refreshTokenMaxAgeSeconds,
  });

  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser(data.session.access_token);

  if (userError || !user) {
    return null;
  }

  return user;
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate("authenticate", async (request, reply) => {
    const cookieToken = request.cookies["sb-access-token"];
    const refreshToken = request.cookies["sb-refresh-token"];
    const authHeader = request.headers.authorization;
    const bearerToken =
      typeof authHeader === "string" ? authHeader.match(/^Bearer\s+(.+)$/i)?.[1] : undefined;
    const token = cookieToken ?? bearerToken;

    try {
      if (token) {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser(token);

        if (!error && user) {
          request.user = user;
          return;
        }
      }

      const refreshedUser = await tryRefreshWithCookie(refreshToken, reply);
      if (!refreshedUser) {
        return reply.code(401).send({ error: "Invalid Session" });
      }

      request.user = refreshedUser;
    } catch (authError) {
      request.log.warn({ authError }, "Supabase auth check failed");
      return reply.code(401).send({ error: "Invalid Session" });
    }
  });
};

export default fp(authPlugin);
