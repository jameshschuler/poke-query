import "fastify"; // Essential: Tells TS we are augmenting the existing module
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { type User as SupabaseUser } from "@supabase/supabase-js";
import * as schema from "../db/schema.js";
import {
  type FastifyInstance,
  type FastifyBaseLogger,
  type RawReplyDefaultExpression,
  type RawRequestDefaultExpression,
  type RawServerDefault,
  type FastifyReply,
} from "fastify";
import { type TypeBoxTypeProvider } from "@fastify/type-provider-typebox";

// 1. Augment the Global Fastify Interfaces
// This makes .db and .user available everywhere, even in standard Fastify types
declare module "fastify" {
  interface FastifyInstance {
    db: PostgresJsDatabase<typeof schema>;
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    user: SupabaseUser;
  }
}

// 2. Export the TypeBox-aware Alias
// Because this alias extends 'FastifyInstance', it automatically
// inherits the 'db' and 'authenticate' properties from the augmentation above.
export type FastifyTypebox = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  RawReplyDefaultExpression<RawServerDefault>,
  FastifyBaseLogger,
  TypeBoxTypeProvider
>;
