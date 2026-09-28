import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

beforeEach(() => vi.resetModules())
afterEach(() => vi.unstubAllGlobals())

describe("API session token lifecycle", () => {
  it.each([null, [], {}, { message: "Proxy returned the wrong payload" }])(
    "rejects a successful HTTP response without the API data envelope: %j",
    async (body) => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body)))
      const { request } = await import("../src/lib/api")
      await expect(request("/workspace")).rejects.toMatchObject({ status: 502 })
    },
  )

  it("reports a non-JSON proxy response instead of treating it as application data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>Unavailable</html>")))
    const { request } = await import("../src/lib/api")
    await expect(request("/workspace")).rejects.toMatchObject({ status: 502 })
  })

  it("preserves an expired-session signal even when the error body is malformed", async () => {
    const expired = vi.fn()
    window.addEventListener("session-expired", expired)
    try {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(null, { status: 401 })))
      const { request } = await import("../src/lib/api")
      await expect(request("/workspace")).rejects.toMatchObject({ status: 401 })
      expect(expired).toHaveBeenCalledOnce()
    } finally {
      window.removeEventListener("session-expired", expired)
    }
  })

  it("preserves genuine 419 errors and fetches a new token on retry", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ data: { csrf: "expired-token" } }))
      .mockResolvedValueOnce(Response.json({ message: "Session expired. Reload the page and try again." }, { status: 419 }))
      .mockResolvedValueOnce(Response.json({ data: { csrf: "fresh-token" } }))
      .mockResolvedValueOnce(Response.json({ data: {} }))
    vi.stubGlobal("fetch", fetchMock)
    const { request } = await import("../src/lib/api")
    await expect(request("/cases", "POST", {})).rejects.toMatchObject({
      status: 419, message: "Session expired. Reload the page and try again.",
    })
    await request("/cases", "POST", {})
    expect(new Headers(fetchMock.mock.calls[3][1].headers).get("X-CSRF-Token")).toBe("fresh-token")
  })

  it("fetches a fresh CSRF token after each logout before logging in again", async () => {
    let token = "anonymous-0"
    let generation = 0
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/auth/csrf")
        return Response.json({ data: { csrf: token } })
      if (new Headers(init?.headers).get("X-CSRF-Token") !== token)
        return Response.json({ message: "Session expired. Reload the page and try again." }, { status: 419 })
      if (url === "/api/auth/login") {
        token = `authenticated-${++generation}`
        return Response.json({ data: { csrf: token } })
      }
      if (url === "/api/auth/logout") {
        token = `anonymous-${generation}`
        return Response.json({ data: {} })
      }
      throw new Error(`Unexpected request: ${url}`)
    })
    vi.stubGlobal("fetch", fetchMock)
    const { request } = await import("../src/lib/api")
    await request("/auth/login", "POST", { email: "test@example.test", password: "test" })
    for (let i = 0; i < 3; i++) {
      await request("/auth/logout", "POST")
      await expect(request("/auth/login", "POST", { email: "test@example.test", password: "test" }))
        .resolves.toEqual({ csrf: `authenticated-${i + 2}` })
    }
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/auth/csrf", "/api/auth/login",
      ...Array.from({ length: 3 }, () => ["/api/auth/logout", "/api/auth/csrf", "/api/auth/login"]).flat(),
    ])
  })

  it("preserves the existing token when logout fails", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ data: { csrf: "current-token" } }))
      .mockResolvedValueOnce(Response.json({ message: "Server unavailable" }, { status: 500 }))
      .mockResolvedValueOnce(Response.json({ data: {} }))
    vi.stubGlobal("fetch", fetchMock)
    const { request } = await import("../src/lib/api")
    await expect(request("/auth/logout", "POST")).rejects.toMatchObject({ status: 500 })
    await request("/auth/logout", "POST")
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(new Headers(fetchMock.mock.calls[2][1].headers).get("X-CSRF-Token")).toBe("current-token")
  })
})
