import "dotenv/config.js";
import { buildApp } from "./app.js";

const start = async () => {
  const app = await buildApp();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
  const host = process.env.HOST ?? "0.0.0.0";

  try {
    await app.listen({ port, host });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

void start();
