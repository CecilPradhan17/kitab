import { Pool } from "pg";

/**
 * A single shared connection pool for the whole app.
 *
 * Pool vs Client: a Client is one connection you open and close yourself. A
 * Pool keeps a small set of connections alive and lends one out per query,
 * returning it afterwards — so concurrent requests don't each pay connect/
 * disconnect cost, and we can't exhaust the database by opening a connection
 * per request. This is the pooling a long-running server is good at (and part
 * of why we chose Express over serverless route handlers).
 *
 * The connection string comes from DATABASE_URL (loaded from .env in index.ts).
 */
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
