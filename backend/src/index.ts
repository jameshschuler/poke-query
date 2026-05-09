import { buildApp } from "./app.js";
import "dotenv/config.js";

const start = async () => {
  const app = await buildApp();
  try {
    await app.listen({ port: process.env.PORT ? parseInt(process.env.PORT) : 3001 });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

void start();
