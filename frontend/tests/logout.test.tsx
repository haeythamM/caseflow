import { afterEach, expect, it, vi } from "vitest"
import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, useLocation } from "react-router-dom"
import App from "../src/App"
import { request, errorMessage } from "../src/lib/api"
import fixture from "../../backend/tests/fixtures/workspace.json"

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

function Location() {
  return <output data-testid="location">{useLocation().pathname}</output>
}

it("repeats login/logout without refresh and isolates late responses from the next session", async () => {
  let authenticated = false
  let token = "anonymous"
  let sequence = 0
  let finishLogout: () => void = () => {}
  const pending: Array<(response: Response) => void> = []
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    if (url === "/api/late") return new Promise<Response>((resolve) => pending.push(resolve))
    if (url === "/api/auth/csrf") return Response.json({ data: { csrf: token } })
    if (init?.method === "POST" && new Headers(init.headers).get("X-CSRF-Token") !== token)
      return Response.json({ message: "Session expired. Reload the page and try again." }, { status: 419 })
    if (url === "/api/auth/login") {
      authenticated = true
      token = `session-${++sequence}`
      return Response.json({ data: { csrf: token } })
    }
    if (url === "/api/auth/logout") {
      authenticated = false
      token = `anonymous-${sequence}`
      return new Promise<Response>((resolve) => {
        finishLogout = () => resolve(Response.json({ data: {} }))
      })
    }
    if (!authenticated) return Response.json({ message: "Please sign in." }, { status: 401 })
    if (url === "/api/auth/me") return Response.json({ data: {} })
    if (url === "/api/workspace") return Response.json({ data: {
      ...fixture, user: { id: "1", name: "Admin", role: "Admin", email: "admin@test.test", settings: {}, avatarId: null },
    } })
    throw new Error(`Unexpected URL ${url}`)
  }))
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  const expired = vi.fn()
  window.addEventListener("session-expired", expired)
  try {
    render(<MemoryRouter initialEntries={["/customers"]}><App /><Location /></MemoryRouter>)
    for (let cycle = 0; cycle < 3; cycle++) {
      await screen.findByRole("heading", { name: "Sign in to your account" })
      await userEvent.type(screen.getByPlaceholderText("you@example.test"), "admin@test.test")
      await userEvent.type(document.querySelector('input[type="password"]')!, "password")
      await userEvent.click(screen.getByRole("button", { name: /^Sign In$/i }))
      await userEvent.click(await screen.findByRole("link", { name: "Customers" }))
      await screen.findByRole("heading", { name: "Customers", level: 1 })
      // Responses from the previous login must not expire this new session.
      if (pending.length) {
        await act(async () => {
          pending.shift()!(Response.json({ message: "Please sign in." }, { status: 401 }))
        })
        expect(expired).not.toHaveBeenCalled()
      }
      const late = request("/late").catch(errorMessage)
      const late419 = request("/late").catch(errorMessage)
      await userEvent.click(screen.getByRole("button", { name: "Logout" }))
      expect(screen.queryByRole("heading", { name: "Customers", level: 1 })).toBeNull()
      await act(async () => {
        pending.pop()!(Response.json({ message: "Session expired. Reload the page and try again." }, { status: 419 }))
        expect(await late419).toBe("")
        finishLogout()
      })
      await screen.findByRole("heading", { name: "Sign in to your account" })
      expect(screen.getByTestId("location").textContent).toBe("/login")
      expect(screen.queryByRole("link", { name: "Customers" })).toBeNull()
      expect(screen.queryByText(/session expired/i)).toBeNull()
      expect(expired).not.toHaveBeenCalled()
      if (cycle === 2) {
        pending.shift()!(Response.json({ data: { csrf: "stale" } }))
        expect(await late).toBe("")
      }
    }
    // Sign in once more, then exercise the real global 401 handling.
    await userEvent.type(screen.getByPlaceholderText("you@example.test"), "admin@test.test")
    await userEvent.type(document.querySelector('input[type="password"]')!, "password")
    await userEvent.click(screen.getByRole("button", { name: /^Sign In$/i }))
    await screen.findByRole("button", { name: "Logout" })
    authenticated = false
    await act(async () => { await request("/workspace").catch(() => {}) })
    await screen.findByText("Your session expired. Please sign in again.")
    await waitFor(() => expect(screen.getByTestId("location").textContent).toBe("/login"))
    expect(expired).toHaveBeenCalledTimes(1)
  } finally {
    window.removeEventListener("session-expired", expired)
  }
}, 20000)
