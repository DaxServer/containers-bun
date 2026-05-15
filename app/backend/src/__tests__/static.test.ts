import { describe, it, expect, beforeAll } from "bun:test"
import path from "node:path"

let app: Awaited<typeof import('@/app')>['app']

beforeAll(async () => {
  process.env.STATIC_DIR = path.resolve(__dirname, "../../../frontend/dist")
  const module = await import("@/app")
  app = module.app
})

describe("Static file serving", () => {
  it("GET / returns 200 HTML with doctype", async () => {
    const response = await app.handle(new Request("http://localhost/"))
    expect(response.status).toBe(200)
    const text = await response.text()
    expect(text.toLowerCase()).toContain("<!doctype html>")
  })

  it("GET /batches returns index.html for SPA routing", async () => {
    const response = await app.handle(new Request("http://localhost/batches"))
    expect(response.status).toBe(200)
    const text = await response.text()
    expect(text.toLowerCase()).toContain("<!doctype html>")
  })
})
