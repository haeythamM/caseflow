import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readdirSync, unlinkSync, rmdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const sessions = mkdtempSync(path.join(root, "storage", "http-sessions-"));
const port = 18000 + Math.floor(Math.random() * 1000);
// Only unauthenticated boundary requests: no persistent database writes.
const server = spawn(process.env.PHP_BINARY || "php", ["-S", `127.0.0.1:${port}`, "-t", "public", "public/index.php"], {
  cwd: root, env: { ...process.env, CASEFLOW_SESSION_PATH: sessions }, windowsHide: true, stdio: "pipe",
});
let logs = "", cookie = "", csrf = "", checks = 0;
server.stderr.on("data", chunk => logs += chunk);
const stopped = new Promise(resolve => server.once("exit", resolve));
let spawnError;
server.on("error", error => { spawnError = error; });
async function call(route, method = "GET", body, status = 200, token = true, raw = false) {
  const response = await fetch(`http://127.0.0.1:${port}/api${route}`, {
    method,
    headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(token && csrf ? { "X-CSRF-Token": csrf } : {}) },
    body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
  });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  const result = await response.json();
  assert.equal(response.status, status, `${method} ${route}: ${JSON.stringify(result)}`);
  if (result.data?.csrf) csrf = result.data.csrf;
  checks++;
  return result;
}
try {
  for (let i = 0; i < 50; i++) {
    if (spawnError) throw spawnError;
    try { await fetch(`http://127.0.0.1:${port}/api/health`); break; }
    catch { await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  await call("/health");
  await call("/auth/csrf");
  await call("/auth/me", "GET", undefined, 401);
  await call("/workspace", "GET", undefined, 401);
  await call("/users", "GET", undefined, 401);
  await call("/users/1/avatar", "GET", undefined, 401);
  await call("/attachments/FILE-test", "GET", undefined, 401);
  await call("/auth/login", "POST", {}, 419, false);
  await call("/customers", "POST", {}, 401);
  await call("/auth/login", "POST", "{", 400, true, true);
  await call("/auth/login", "POST", "[]", 400, true, true);
  await call("/auth/login", "POST", { value: "x".repeat(65537) }, 413);
  await call("/health", "POST", {}, 405);
  await call("/not-a-route", "GET", undefined, 404);
  await call("/auth/logout", "POST");
  await call("/auth/me", "GET", undefined, 401);
  console.log(`Passed ${checks} unauthenticated HTTP boundary checks; authenticated flows require isolated integration tests.`);
} catch (error) {
  console.error(logs); throw error;
} finally {
  if (server.pid) { server.kill(); await stopped; }
  for (const file of readdirSync(sessions)) unlinkSync(path.join(sessions, file));
  rmdirSync(sessions);
}
