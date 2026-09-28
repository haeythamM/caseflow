// Run with PLAYWRIGHT_MODULE pointing to an installed playwright/index.mjs.
import assert from "node:assert/strict"
import { readFileSync, mkdirSync } from "node:fs"
import { pathToFileURL } from "node:url"
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE
    ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href
    : "playwright"
)
const browser = await chromium.launch({ channel: "chrome" })
try {
  const context = await browser.newContext({ isMobile: true, hasTouch: true })
  const page = await context.newPage()
  const fixture = JSON.parse(
    readFileSync(
      new URL("../../backend/tests/fixtures/workspace.json", import.meta.url),
      "utf8",
    ),
  )
  const user = {
    id: "TEST",
    name: "CaseFlow Demo Admin",
    role: "Admin",
    email: "test@example.test",
    avatarId: null,
    settings: {},
  }
  await context.route("**/api/**", (route) =>
    route.fulfill({
      json: {
        data:
          new URL(route.request().url()).pathname === "/api/workspace"
            ? { ...fixture, user, attachments: [] }
            : user,
      },
    }),
  )
  const cdp = await context.newCDPSession(page)
  mkdirSync(".responsive-results", { recursive: true })
  for (const [width, height] of [
    [440, 956],
    [440, 800],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height })
    await page.goto("http://127.0.0.1:8443/dashboard")
    await page.locator("main .recharts-wrapper").waitFor()
    await page.evaluate(() => document.fonts.ready)
    // Real touch input, followed by release and settling; no scrollIntoView.
    for (let swipe = 0; swipe < 8; swipe++) {
      const start = height - 70,
        end = 230
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: width / 2, y: start }],
      })
      for (let step = 1; step <= 10; step++) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [
            { x: width / 2, y: start - ((start - end) * step) / 10 },
          ],
        })
        await page.waitForTimeout(16)
      }
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      })
      await page.waitForTimeout(150)
    }
    await page.waitForTimeout(700)
    const row = page
      .locator("main span")
      .filter({ hasText: /^Closed$/ })
      .locator("../..")
    const box = await row.boundingBox()
    assert.ok(
      box && box.y >= 0 && box.y + box.height <= height,
      `${width}x${height}: entire Closed row remains visible after touch release`,
    )
    const main = await page.locator("main").boundingBox()
    assert.ok(
      main && box.y >= main.y && box.y + box.height <= main.y + main.height,
    )
    await page.screenshot({
      path: `.responsive-results/${width}x${height}-touch-released.png`,
    })
    console.log(
      `PASS ${width}x${height}: Closed row bottom ${box.y + box.height}, viewport bottom ${height}`,
    )
  }
} finally {
  await browser.close()
}
