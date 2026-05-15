import { Elysia } from "elysia"
import { staticPlugin } from "@elysiajs/static"
import path from "node:path"

const STATIC_DIR = Bun.env.STATIC_DIR

const base = new Elysia().get("/health", () => ({ status: "ok" }))

export const app = STATIC_DIR
  ? base
      .use(staticPlugin({ assets: STATIC_DIR, prefix: "/" }))
      .get("/*", () => Bun.file(path.join(STATIC_DIR, "index.html")))
  : base
