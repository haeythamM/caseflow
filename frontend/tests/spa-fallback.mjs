import assert from "node:assert/strict"
import { createServer } from "vite"

// Isolated ephemeral Vite server; no writes or requests to the PHP backend.
const server = await createServer({
  server: { host: "127.0.0.1", port: 0, strictPort: false },
})
try {
  await server.listen()
  const address = server.httpServer.address()
  for (const path of [
    "/login",
    "/customers/CUST-001/edit",
    "/cases/CASE-1042",
    "/users",
    "/about",
    "/unknown/deep/path",
  ]) {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      headers: { Accept: "text/html" },
    })
    assert.equal(response.status, 200, path)
    assert.match(response.headers.get("content-type"), /text\/html/)
    assert.match(await response.text(), /src="\/src\/main.tsx"/)
  }
  console.log("Passed 6 Vite SPA deep-link fallback checks.")
} finally {
  await server.close()
}
