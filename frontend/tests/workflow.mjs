// Opt-in only: this suite creates records in a disposable local database.
import { chromium, expect } from "playwright/test"
import assert from "node:assert/strict"

if (process.env.CASEFLOW_E2E !== "1") throw new Error("Set CASEFLOW_E2E=1 only for a disposable local environment.")
const baseURL = process.env.CASEFLOW_E2E_URL || "http://127.0.0.1:8443"
if (!["127.0.0.1", "localhost"].includes(new URL(baseURL).hostname)) throw new Error("Local test servers only.")
const email = process.env.CASEFLOW_E2E_EMAIL
const password = process.env.CASEFLOW_E2E_PASSWORD
if (!email?.endsWith("@example.test") || !password) throw new Error("Supply a synthetic Admin account through CASEFLOW_E2E_EMAIL/PASSWORD.")
const browser = await chromium.launch({ channel: "chrome", headless: true })
const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 960 } })
const page = await context.newPage()
const errors = []
page.on("pageerror", error => errors.push(error.message))
page.on("console", message => {
  if (message.type() === "error" && !message.text().includes("401")) errors.push(message.text())
})
const unique = Date.now().toString(36)
const responseFor = (path, method) => page.waitForResponse(response => new URL(response.url()).pathname === `/api${path}` && response.request().method() === method)
const workspace = async () => {
  const response = await context.request.get("/api/workspace")
  assert.equal(response.status(), 200)
  return (await response.json()).data
}

try {
  await page.goto("/login")
  await page.getByLabel("Email address").fill(email)
  await page.getByLabel("Password", { exact: true }).fill(password)
  await page.getByRole("button", { name: "Sign In", exact: true }).click()
  await page.waitForURL("**/dashboard")
  await page.getByText(/^Total Customers$/i).waitFor()
  assert.match(await page.title(), /CaseFlow/)
  console.log("PASS login and dashboard")

  await page.goto("/customers/new")
  await page.getByLabel("First Name *", { exact: true }).fill("Workflow")
  await page.getByLabel("Last Name *", { exact: true }).fill(`Sample-${unique}`)
  await page.getByLabel("Email Address *", { exact: true }).fill(`workflow-${unique}@example.test`)
  await page.getByLabel("Phone Number *", { exact: true }).fill("+1 (202) 555-0198")
  const createdCustomer = responseFor("/customers", "POST")
  await page.getByRole("button", { name: "Save Customer", exact: true }).click()
  const customerResponse = await createdCustomer
  assert.equal(customerResponse.ok(), true)
  const customer = (await customerResponse.json()).data
  await page.waitForURL("**/customers")
  await page.goto(`/customers/${customer.id}/edit`)
  await page.getByLabel("Phone Number *", { exact: true }).fill("+1 (202) 555-0199")
  await page.getByRole("button", { name: "Save Changes", exact: true }).click()
  await page.waitForURL("**/customers")
  assert.equal((await workspace()).customers.find(item => item.id === customer.id).phone, "+1 (202) 555-0199")
  console.log("PASS customer create/edit and persistence")

  await page.goto(`/cases/new?customerId=${customer.id}`)
  await page.getByLabel("Case Subject *", { exact: true }).fill(`Workflow verification ${unique}`)
  await page.getByLabel("Description *", { exact: true }).fill("Synthetic browser workflow; no real customer data.")
  const createdCase = responseFor("/cases", "POST")
  await page.getByRole("button", { name: "Create Case", exact: true }).click()
  const caseResponse = await createdCase
  assert.equal(caseResponse.ok(), true)
  const caseItem = (await caseResponse.json()).data
  await page.waitForURL("**/cases")
  await page.goto(`/cases/${caseItem.id}`)
  await page.getByRole("button", { name: "Close Case", exact: true }).click()
  await expect.poll(async () => (await workspace()).cases.find(item => item.id === caseItem.id).status).toBe("Closed")
  assert.ok((await workspace()).cases.find(item => item.id === caseItem.id).resolvedAt)
  await page.getByRole("button", { name: "Reopen Case", exact: true }).click()
  await expect.poll(async () => (await workspace()).cases.find(item => item.id === caseItem.id).status).toBe("Open")
  assert.equal((await workspace()).cases.find(item => item.id === caseItem.id).resolvedAt, null)
  console.log("PASS case create/detail, close/reopen and resolution timestamps")

  await page.goto("/communications")
  await page.getByRole("button", { name: "Log communication" }).click()
  await page.getByLabel("Case", { exact: true }).selectOption(caseItem.id)
  await page.getByLabel("Subject", { exact: true }).fill(`Verification note ${unique}`)
  await page.getByPlaceholder("Conversation or note").fill("Synthetic communication for the isolated workflow test.")
  const communication = responseFor("/communications", "POST")
  await page.getByRole("button", { name: "Save communication", exact: true }).click()
  assert.equal((await communication).ok(), true)
  await expect.poll(async () => (await workspace()).communications.some(item => item.subject === `Verification note ${unique}`)).toBe(true)
  assert.ok((await workspace()).caseActivities[caseItem.id].length >= 4)
  console.log("PASS communications and activity history")

  await page.goto("/reports")
  await page.getByText("Loading page…", { exact: true }).waitFor({ state: "hidden" })
  await page.locator("main .recharts-wrapper").first().waitFor()
  await page.goto("/settings")
  await page.getByLabel("Full Name", { exact: true }).waitFor()
  await page.getByRole("button", { name: "Save Profile", exact: true }).click()
  await page.getByText("Profile settings saved successfully.", { exact: true }).waitFor()
  console.log("PASS reports, settings load and profile save")

  const csrf = (await (await context.request.get("/api/auth/csrf")).json()).data.csrf
  const invalid = await context.request.patch(`/api/customers/${customer.id}`, { headers: { "X-CSRF-Token": csrf }, data: { firstName: "x".repeat(101) } })
  assert.equal(invalid.status(), 422)
  assert.equal((await workspace()).customers.find(item => item.id === customer.id).firstName, "Workflow")
  const csrfDenied = await context.request.post("/api/customers", { data: {} })
  assert.equal(csrfDenied.status(), 419)
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64")
  const uploaded = await context.request.post(`/api/cases/${caseItem.id}/attachments`, { headers: { "X-CSRF-Token": csrf }, multipart: { file: { name: "synthetic.png", mimeType: "image/png", buffer: png } } })
  assert.equal(uploaded.status(), 200)
  const fileId = (await uploaded.json()).data.id
  assert.deepEqual(await (await context.request.get(`/api/attachments/${fileId}`)).body(), png)
  const rejected = await context.request.post(`/api/cases/${caseItem.id}/attachments`, { headers: { "X-CSRF-Token": csrf }, multipart: { file: { name: "not-really.png", mimeType: "image/png", buffer: Buffer.from("plain text") } } })
  assert.equal(rejected.status(), 422)
  console.log("PASS schema-limit errors, CSRF rejection, upload/download and MIME validation")

  await page.getByRole("button", { name: "Logout", exact: true }).click()
  await page.waitForURL("**/login")
  assert.equal((await context.request.get("/api/workspace")).status(), 401)
  await page.goto("/customers")
  await page.waitForURL("**/login")
  assert.deepEqual(errors, [])
  console.log("PASS logout, protected-route redirect and no unexpected browser errors")
} finally {
  await browser.close()
}
