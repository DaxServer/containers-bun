const port = process.env.PORT ?? 8000

Bun.serve({
  port,
  fetch() {
    return new Response("Hello from Bun on Toolforge!")
  },
})

console.log(`Listening on port ${port}`)
