export function assertQaLocalOnlySeedScript(scriptName: string): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `${scriptName} is restricted to local/QA environments. Use npm run db:seed:search:prod for production curated seeding.`,
    );
  }
}
