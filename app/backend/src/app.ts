import { Elysia } from "elysia"
import { staticPlugin } from "@elysiajs/static"
import path from "node:path"

const FRONTEND_DIST = process.env.STATIC_DIR ?? "./frontend/dist"
const INDEX_HTML = path.join(FRONTEND_DIST, "index.html")

export const app = new Elysia()
  .use(staticPlugin({ assets: FRONTEND_DIST, prefix: "/" }))
  .get("/health", () => ({ status: "ok" }))
  // SPA fallback — API routes must be registered above this
  .get("/*", () => Bun.file(INDEX_HTML))
