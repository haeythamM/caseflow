// Run with PLAYWRIGHT_MODULE pointing to an installed playwright/index.mjs.
// Uses isolated fixture responses; never writes to the real backend.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs"
import { pathToFileURL } from "node:url"
import assert from "node:assert/strict"
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE
    ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href
    : "playwright"
)
const browser = await chromium.launch({ channel: "chrome", headless: true })
const mobile = process.env.RESPONSIVE_MOBILE === "1"
const context = await browser.newContext(
  mobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 3 } : {},
)
const page = await context.newPage()
const fixture = JSON.parse(
  readFileSync(
    new URL("../../backend/tests/fixtures/workspace.json", import.meta.url),
    "utf8",
  ),
)
const user = {
  id: "USER-TEST",
  name: "Responsive Test Agent",
  email: "responsive@example.test",
  role: "Admin",
  avatarId: null,
  settings: {},
}
let workspace = { ...fixture, user, attachments: [] }
let loggedIn = true
const errors = []
page.on("pageerror", (error) => errors.push(error.message))
await context.route("**/api/**", (route) => {
  const path = new URL(route.request().url()).pathname
  let data =
    path === "/api/workspace"
      ? workspace
      : path === "/api/users"
        ? Array.from({ length: 36 }, (_, i) => ({
            ...user,
            id: `USER-${i}`,
            name: `Test Agent ${i}`,
            createdAt: "2026-09-18",
          }))
        : user
  return route.fulfill({
    status: path === "/api/auth/me" && !loggedIn ? 401 : 200,
    contentType: "application/json",
    body: JSON.stringify({ data }),
  })
})
const sizes = mobile
  ? [
      [390, 844],
      [844, 390],
    ]
  : [
      [320, 568],
      [360, 800],
      [390, 844],
      [430, 932],
      [640, 800],
      [768, 1024],
      [820, 1180],
      [1024, 768],
      [1280, 800],
      [1440, 900],
      [667, 375],
    ]
const routes = [
  "/dashboard",
  "/customers",
  "/customers/new",
  "/customers/CUST-001",
  "/customers/CUST-001/edit",
  "/cases",
  "/cases/new",
  "/cases/CASE-1042",
  "/cases/CASE-1042/edit",
  "/communications",
  "/reports",
  "/users",
  "/settings",
  "/about",
  "/not-found",
  "/login",
]
const out = process.env.RESPONSIVE_OUTPUT || ".responsive-results"
mkdirSync(out, { recursive: true })
const results = []
async function bottomVisible(label) {
  const main = page.locator("main")
  if (!(await main.count())) return
  const reachable = await main.evaluate((el) => {
    el.scrollTop = el.scrollHeight
    return (
      el.getBoundingClientRect().bottom <= innerHeight + 1 &&
      el.scrollTop + el.clientHeight >= el.scrollHeight - 1 &&
      el.clientHeight > 0
    )
  })
  assert.ok(reachable, `${label}: page bottom is reachable`)
  await main.evaluate((el) => {
    el.scrollTop = 0
  })
}
async function audit(label) {
  for (const panel of await page.locator("header .z-50").all()) {
    const box = await panel.boundingBox()
    assert.ok(
      box && box.y >= 0 && box.y + box.height <= page.viewportSize().height + 1,
      `${label}: dropdown remains within the available height`,
    )
  }
  await page
    .getByText("Loading page…", { exact: true })
    .waitFor({ state: "hidden" })
  if (["/reports", "/dashboard"].includes(new URL(page.url()).pathname)) {
    await page.locator(".recharts-wrapper").first().waitFor()
    await page.waitForFunction(() =>
      [...document.querySelectorAll(".recharts-wrapper")].every(
        (el) =>
          el.getBoundingClientRect().width > 0 &&
          el.getBoundingClientRect().height > 0,
      ),
    )
  }
  const result = await page.evaluate(() => {
    const main = document.querySelector("main")
    const outside = [...document.querySelectorAll("header *, main *, form *")]
      .filter((el) => {
        const r = el.getBoundingClientRect()
        if (
          !r.width ||
          !r.height ||
          el.closest("svg, aside, .recharts-wrapper")
        )
          return false
        for (
          let p = el.parentElement;
          p && p !== main && p !== document.body;
          p = p.parentElement
        ) {
          if (
            ["auto", "scroll"].includes(getComputedStyle(p).overflowX) &&
            p.scrollWidth > p.clientWidth + 1
          )
            return false
        }
        return r.left < -1 || r.right > innerWidth + 1
      })
      .slice(0, 8)
      .map((el) => ({
        tag: el.tagName,
        text: el.textContent.slice(0, 70),
        class: el.className,
      }))
    return {
      documentOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      mainOverflow: !!main && main.scrollWidth > main.clientWidth + 1,
      outside,
    }
  })
  results.push({ size: page.viewportSize(), route: label, ...result })
}
try {
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height })
    for (const route of routes) {
      loggedIn = route !== "/login"
      await page.goto(`http://127.0.0.1:8443${route}`)
      await page.locator(loggedIn ? "main" : "form").waitFor()
      await page.evaluate(() => document.fonts.ready)
      await page.waitForTimeout(120)
      await audit(route)
      await bottomVisible(`${width} ${route}`)
      // Every table remains horizontally scrollable to its final column.
      for (const table of await page.locator("main table").all()) {
        const accessible = await table.evaluate((el) => {
          for (
            let parent = el.parentElement;
            parent;
            parent = parent.parentElement
          ) {
            if (
              ["auto", "scroll"].includes(getComputedStyle(parent).overflowX)
            ) {
              parent.scrollLeft = parent.scrollWidth
              const cell = el.querySelector("tr")?.lastElementChild
              const fits =
                !cell ||
                cell.getBoundingClientRect().right <=
                  parent.getBoundingClientRect().right + 1
              parent.scrollLeft = 0
              return fits
            }
          }
          return el.getBoundingClientRect().right <= innerWidth
        })
        assert.ok(
          accessible,
          `${width} ${route}: last table column is reachable`,
        )
      }
      if (route === "/settings") {
        for (const tab of ["Account", "Notifications", "Display"]) {
          await page.getByRole("button", { name: tab, exact: true }).click()
          await audit(`${route}#${tab}`)
          await bottomVisible(`${width} ${route}#${tab}`)
        }
      }
      if (route === "/customers/CUST-001") {
        for (const tab of ["cases", "communications", "notes"]) {
          await page
            .locator("main button")
            .filter({ hasText: new RegExp(`^${tab}`, "i") })
            .first()
            .click()
          await audit(`${route}#${tab}`)
        }
      }
      if (route === "/dashboard") {
        await page.getByRole("button", { name: "Recent notifications" }).click()
        await audit(`${route}#activity`)
        await page.getByRole("button", { name: "Recent notifications" }).click()
        const search = page.getByRole("textbox", {
          name: "Search cases and customers",
        })
        assert.ok(
          await search.isVisible(),
          "Global search must be available on mobile",
        )
        await search.fill("SampleOne")
        await audit(`${route}#search`)
        await page
          .locator("header button")
          .filter({ hasText: "CUST-001" })
          .click()
        await page.waitForURL("**/customers/CUST-001")
        if (width < 768) {
          await page.getByRole("button", { name: "Open menu" }).click()
          await page.getByRole("link", { name: "About", exact: true }).click()
          await page.waitForURL("**/about")
          assert.ok(
            await page.getByRole("button", { name: "Open menu" }).isVisible(),
          )
        }
        await page.goto("http://127.0.0.1:8443/dashboard")
        await page.locator("main table").waitFor()
      }
      if (route === "/communications") {
        await page.getByRole("button", { name: "Log communication" }).click()
        await audit(`${route}#compose`)
        await page
          .getByRole("textbox", { name: "Subject", exact: true })
          .fill("Responsive layout check")
        await page
          .getByRole("textbox", { name: "Message", exact: true })
          .fill("Local fixture only")
        await page
          .getByRole("button", { name: "Save communication" })
          .scrollIntoViewIfNeeded()
        await page.getByRole("button", { name: "Log communication" }).click()
      }
      if (route === "/customers") {
        await page.getByTitle("Delete", { exact: true }).first().click()
        await audit(`${route}#delete-dialog`)
        const cancel = page.getByRole("button", { name: "Cancel", exact: true })
        await cancel.scrollIntoViewIfNeeded()
        const box = await cancel.boundingBox()
        assert.ok(
          box && box.y >= 0 && box.y + box.height <= height,
          "Dialog controls fit the viewport",
        )
        await cancel.click()
      }
      if (
        [320, 768, 1440].includes(width) &&
        [
          "/dashboard",
          "/settings",
          "/customers/CUST-001",
          "/cases/CASE-1042",
          "/reports",
          "/login",
        ].includes(route)
      ) {
        if (route !== "/login") await page.locator("main").evaluate((el) => {
            el.scrollTop = 0
          })
        await page.screenshot({
          path: `${out}/${width}-${route.replaceAll("/", "_")}.png`,
          fullPage: true,
        })
        if (route !== "/login") {
          await page.locator("main").evaluate((el) => {
            el.scrollTop = el.scrollHeight
          })
          await page.screenshot({
            path: `${out}/${width}-${route.replaceAll("/", "_")}-bottom.png`,
          })
        }
      }
    }
    console.log(`Checked ${width}x${height}`)
  }
  // Stress user-entered strings, empty screens, and a keyboard-sized viewport.
  const original = workspace
  const long = "LongUnbrokenValue".repeat(10)
  workspace = structuredClone(original)
  workspace.customers[0].email = `${long}@example.test`
  workspace.customers[0].firstName = long
  workspace.cases[0].subject = long
  workspace.cases[0].description = long
  workspace.attachments = [
    {
      id: "ATT-TEST",
      caseId: workspace.cases[0].id,
      name: `${long}.pdf`,
      size: 1000,
    },
  ]
  loggedIn = true
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 600 })
    for (const route of [
      `/customers/${workspace.customers[0].id}`,
      `/cases/${workspace.cases[0].id}`,
    ]) {
      await page.goto(`http://127.0.0.1:8443${route}`)
      await page.locator("main").waitFor()
      await audit(`${route}#long-content`)
      await bottomVisible(route)
    }
  }
  workspace = {
    ...original,
    customers: [],
    cases: [],
    communications: [],
    caseActivities: {},
    attachments: [],
  }
  await page.setViewportSize({ width: 320, height: 320 })
  for (const route of [
    "/dashboard",
    "/customers",
    "/cases",
    "/communications",
    "/reports",
    "/settings",
  ]) {
    await page.goto(`http://127.0.0.1:8443${route}`)
    await page.locator("main").waitFor()
    await page.waitForTimeout(150)
    await audit(`${route}#empty-short`)
    await bottomVisible(route)
  }
  workspace = original
  await page.goto("http://127.0.0.1:8443/dashboard")
  await page.locator("main").waitFor()
  await page.getByRole("button", { name: "Recent notifications" }).click()
  await audit("/dashboard#activity-short")
  await page.getByRole("button", { name: "Recent notifications" }).click()
  await page
    .getByRole("textbox", { name: "Search cases and customers" })
    .fill("SampleOne")
  await audit("/dashboard#search-short")
} finally {
  writeFileSync(
    `${out}/audit.json`,
    JSON.stringify({ mobile, results, errors }, null, 2),
  )
  const failures = results.filter(
    (r) => r.documentOverflow || r.mainOverflow || r.outside.length,
  )
  console.log(
    JSON.stringify(
      {
        checks: results.length,
        failures: failures.length,
        errors,
        details: failures.map((r) => ({
          size: r.size,
          route: r.route,
          outside: r.outside,
        })),
      },
      null,
      2,
    ),
  )
  await browser.close()
  if (failures.length || errors.length) process.exitCode = 1
}
