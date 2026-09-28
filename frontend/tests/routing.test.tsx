import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  BrowserRouter,
  MemoryRouter,
  useLocation,
  useNavigate,
} from "react-router-dom"
import App from "../src/App"
import { request, ApiError } from "../src/lib/api"
import { safeReturnPath, navigationPath } from "../src/routing"
import fixture from "../../backend/tests/fixtures/workspace.json"

vi.mock("../src/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/api")>()),
  request: vi.fn(),
}))

const user = {
  id: "1",
  name: "Routing Admin",
  email: "admin@example.test",
  role: "Admin",
  avatarId: null,
  settings: {},
}
let authenticated: boolean
let role: string

// Load the real lazy chart modules outside the short DOM assertion timeout.
beforeAll(async () => {
  await Promise.all([import("../src/pages/Dashboard"), import("../src/pages/Reports")])
}, 60000)

beforeEach(() => {
  authenticated = true
  role = "Admin"
  vi.mocked(request).mockReset()
  vi.mocked(request).mockImplementation(async (path) => {
    if (path === "/auth/me") {
      if (!authenticated) throw new ApiError("Please sign in.", 401)
      return user
    }
    if (path === "/workspace")
      return {
        ...fixture,
        attachments: [{ id: "FILE-test", caseId: "CASE-1042", name: "test.pdf", mime: "application/pdf", size: 4, date: "2026-01-01" }],
        user: { ...user, role, avatarId: "FILE-avatar" },
      }
    if (path === "/auth/login") {
      authenticated = true
      return {}
    }
    if (path === "/auth/logout") {
      authenticated = false
      return {}
    }
    if (path === "/users") return [{ ...user, createdAt: "2026-01-01" }]
    throw new Error(`Unexpected request: ${path}`)
  })
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function LocationProbe() {
  const location = useLocation()
  const navigate = useNavigate()
  return (
    <>
      <output data-testid="location">
        {location.pathname}
        {location.search}
        {location.hash}
      </output>
      <button onClick={() => navigate(-1)}>Test Back</button>
      <button onClick={() => navigate(1)}>Test Forward</button>
    </>
  )
}

function open(path: string, state?: unknown) {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: path.split("?")[0],
          search: path.includes("?") ? `?${path.split("?")[1]}` : "",
          state,
        },
      ]}
    >
      <App />
      <LocationProbe />
    </MemoryRouter>,
  )
}

async function at(path: string) {
  await waitFor(() =>
    expect(screen.getByTestId("location").textContent).toBe(path),
  )
}

async function signIn() {
  await screen.findByRole("heading", { name: "Sign in to your account" })
  await userEvent.type(
    screen.getByPlaceholderText("you@example.test"),
    "admin@example.test",
  )
  await userEvent.type(
    document.querySelector('input[type="password"]')!,
    "test-password",
  )
  await userEvent.click(screen.getByRole("button", { name: /^Sign In$/i }))
}

describe("URL routing with existing pages", () => {
  it.each([
    ["/dashboard", "Dashboard", "Dashboard"],
    ["/customers", "Customers", "Customers"],
    ["/customers/new", "Customer", "Customers"],
    ["/customers/CUST-001", "Customer Profile", "Customers"],
    ["/customers/CUST-001/edit", "Edit Customer", "Customers"],
    ["/cases", "Cases", "Cases"],
    ["/cases/new", "Create Case", "Cases"],
    ["/cases/CASE-1042", "Case Details", "Cases"],
    ["/cases/CASE-1042/edit", "Edit Case", "Cases"],
    ["/communications", "Communications", "Communications"],
    ["/reports", "Reports", "Reports"],
    ["/users", "Users", "Users"],
    ["/settings", "Settings", "Settings"],
    ["/about", "About CaseFlow", "About"],
  ])(
    "opens %s directly with its title and active section",
    async (path, title, section) => {
      open(path)
      await screen.findByRole("heading", { name: title, level: 1 })
      await waitFor(() =>
        expect(screen.queryByText("Loading page…")).toBeNull(),
      )
      expect(
        screen
          .getByRole("link", { name: section })
          .getAttribute("aria-current"),
      ).toBe("page")
      expect(document.title).toBe(`${title} | CaseFlow`)
      await at(path)
    },
  )

  it("uses real links and preserves Back/Forward history", async () => {
    open("/customers")
    await userEvent.click(await screen.findByRole("link", { name: "Cases" }))
    await at("/cases")
    await userEvent.click(screen.getByRole("link", { name: "Users" }))
    await at("/users")
    await userEvent.click(screen.getByRole("button", { name: "Test Back" }))
    await at("/cases")
    expect(
      screen.getByRole("link", { name: "Cases" }).getAttribute("aria-current"),
    ).toBe("page")
    await userEvent.click(screen.getByRole("button", { name: "Test Back" }))
    await at("/customers")
    await userEvent.click(screen.getByRole("button", { name: "Test Forward" }))
    await at("/cases")
  })

  it("responds to browser history and remounts a bookmarked detail URL", async () => {
    window.history.replaceState(null, "", "/cases/CASE-1042")
    const mounted = render(
      <BrowserRouter>
        <App />
        <LocationProbe />
      </BrowserRouter>,
    )
    await screen.findByRole("heading", { name: "Case Details", level: 1 })
    await userEvent.click(screen.getByRole("link", { name: "Customers" }))
    expect(window.location.pathname).toBe("/customers")
    act(() => window.history.back())
    await at("/cases/CASE-1042")
    act(() => window.history.forward())
    await at("/customers")
    act(() => window.history.back())
    await at("/cases/CASE-1042")
    mounted.unmount()
    render(
      <BrowserRouter>
        <App />
        <LocationProbe />
      </BrowserRouter>,
    )
    await screen.findByRole("heading", { name: "Case Details", level: 1 })
    await at("/cases/CASE-1042")
  })

  it("navigates existing customer and case actions to URLs", async () => {
    open("/customers/CUST-001")
    await userEvent.click(
      await screen.findByRole("button", { name: "Edit", exact: true }),
    )
    await at("/customers/CUST-001/edit")
    await userEvent.click(screen.getByRole("button", { name: "Test Back" }))
    await userEvent.click(
      await screen.findByRole("button", { name: "New Case" }),
    )
    await at("/cases/new?customerId=CUST-001")
    expect((document.querySelector("select") as HTMLSelectElement).value).toBe(
      "CUST-001",
    )
    await userEvent.click(screen.getByRole("link", { name: "Cases" }))
    const caseRow = (await screen.findByText("CASE-1042")).closest("tr")!
    await userEvent.click(within(caseRow).getByRole("button", { name: /View/ }))
    await at("/cases/CASE-1042")
    await userEvent.click(screen.getByRole("button", { name: "Edit Case" }))
    await at("/cases/CASE-1042/edit")
  })

  it.each([
    "/customers/missing",
    "/customers/missing/edit",
    "/cases/missing",
    "/cases/missing/edit",
    "/cases/new?customerId=missing",
  ])("handles missing records at %s", async (path) => {
    open(path)
    await screen.findByText(
      path.startsWith("/customers") || path.includes("customerId")
        ? "Customer not found."
        : "Case not found.",
    )
    await at(path)
    expect(screen.queryByRole("button", { name: /Save Changes/ })).toBeNull()
  })

  it.each([true, false])(
    "renders unknown routes as 404 (authenticated=%s)",
    async (signedIn) => {
      authenticated = signedIn
      open("/not-a-page/deep")
      await screen.findByRole("heading", { name: "Page not found", level: 2 })
      expect(
        screen
          .getByRole("link", { name: "Back to Dashboard" })
          .getAttribute("href"),
      ).toBe("/dashboard")
      await at("/not-a-page/deep")
    },
  )
})

describe.each(["Admin", "Support Agent", "Demo Viewer"])("About page for %s", (pageRole) => {
  beforeEach(() => { role = pageRole })

  it("supports direct navigation, refresh, and active Sidebar navigation", async () => {
    const mounted = open("/about")
    await screen.findByRole("heading", { name: "About CaseFlow", level: 1 })
    expect(screen.getByRole("link", { name: "About" }).getAttribute("aria-current")).toBe("page")
    expect(document.title).toBe("About CaseFlow | CaseFlow")
    const main = within(screen.getByRole("main"))
    for (const name of ["Using CaseFlow", "Core Features", "Technology", "Demo Environment", "Copyright"])
      expect(main.getByRole("heading", { name })).toBeTruthy()
    expect(main.getByText("CaseFlow 1.0 Demo")).toBeTruthy()
    expect(main.getByText("© 2026 Haeytham Almalak. All rights reserved.")).toBeTruthy()
    expect(vi.mocked(request).mock.calls.map(([path]) => path)).toEqual(["/auth/me", "/workspace"])
    await at("/about")
    mounted.unmount()
    open("/about")
    await screen.findByRole("heading", { name: "About CaseFlow", level: 1 })
    await at("/about")
    await userEvent.click(screen.getByRole("link", { name: "Cases" }))
    await at("/cases")
    expect(screen.getByRole("link", { name: "About" }).getAttribute("aria-current")).toBeNull()
    await userEvent.click(screen.getByRole("link", { name: "About" }))
    await at("/about")
    expect(screen.getByRole("link", { name: "About" }).getAttribute("aria-current")).toBe("page")
  })

  it("requires sign-in and restores /about after login", async () => {
    authenticated = false
    open("/about")
    await at("/login")
    expect(screen.queryByText("CaseFlow 1.0 Demo")).toBeNull()
    await signIn()
    await screen.findByRole("heading", { name: "About CaseFlow", level: 1 })
    await at("/about")
    expect(safeReturnPath("/about", pageRole)).toBe("/about")
  })
})

describe("session and Admin route guards", () => {
  it("blocks a non-Admin direct /users request without fetching users", async () => {
    role = "Support Agent"
    open("/users")
    await at("/dashboard")
    expect(screen.queryByRole("link", { name: "Users" })).toBeNull()
    expect(
      vi.mocked(request).mock.calls.some(([path]) => path === "/users"),
    ).toBe(false)
  })

  it("allows Admin /users and fetches the existing users API", async () => {
    open("/users")
    await screen.findByRole("cell", { name: /Routing Admin/ })
    expect(request).toHaveBeenCalledWith("/users")
    await at("/users")
  })

  it("restores a protected deep URL after login", async () => {
    authenticated = false
    open("/cases/CASE-1042/edit")
    await at("/login")
    await signIn()
    await at("/cases/CASE-1042/edit")
    await screen.findByRole("heading", { name: "Edit Case", level: 1 })
  })

  it("defaults direct login to Dashboard", async () => {
    authenticated = false
    open("/login")
    await signIn()
    await at("/dashboard")
  })

  it.each([true, false])(
    "redirects the root according to the session (%s)",
    async (signedIn) => {
      authenticated = signedIn
      open("/")
      await at(signedIn ? "/dashboard" : "/login")
    },
  )

  it("ignores an external return URL stored on the login entry", async () => {
    authenticated = false
    open("/login", { from: "https://evil.test" })
    await signIn()
    await at("/dashboard")
  })

  it("does not restore /users for a non-Admin after login", async () => {
    authenticated = false
    role = "Support Agent"
    open("/users")
    await at("/login")
    await signIn()
    await at("/dashboard")
    expect(
      vi.mocked(request).mock.calls.some(([path]) => path === "/users"),
    ).toBe(false)
  })

  it("handles session expiration and restores the current URL", async () => {
    open("/customers/CUST-001")
    await screen.findByRole("heading", { name: "Customer Profile", level: 1 })
    act(() => window.dispatchEvent(new Event("session-expired")))
    await at("/login")
    await screen.findByText("Your session expired. Please sign in again.")
    await signIn()
    await at("/customers/CUST-001")
  })

  it("logs out to login; Back cannot expose protected content", async () => {
    open("/customers")
    await userEvent.click(await screen.findByRole("link", { name: "Cases" }))
    await userEvent.click(screen.getByRole("button", { name: "Logout" }))
    await at("/login")
    await userEvent.click(screen.getByRole("button", { name: "Test Back" }))
    await screen.findByRole("heading", { name: "Sign in to your account" })
    await at("/login")
    expect(screen.queryByRole("navigation")).toBeNull()
  })

  it.each([
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/login",
    "/unknown",
    "/api/users",
    null,
    { pathname: "/cases" },
  ])("rejects unsafe return destination %s", (from) => {
    expect(safeReturnPath(from, "Admin")).toBe("/dashboard")
  })
  it("preserves a safe query and encodes IDs in action URLs", () => {
    expect(safeReturnPath("/cases/new?customerId=CUST-001#form", "Admin")).toBe(
      "/cases/new?customerId=CUST-001#form",
    )
    expect(navigationPath("case-details", { caseId: "a/b" })).toBe(
      "/cases/a%2Fb",
    )
  })
})

describe("Demo Viewer permissions", () => {
  beforeEach(() => { role = "Demo Viewer" })

  it.each([
    ["/dashboard", "Dashboard"],
    ["/customers", "Customers"],
    ["/customers/CUST-001", "Customer Profile"],
    ["/cases", "Cases"],
    ["/cases/CASE-1042", "Case Details"],
    ["/communications", "Communications"],
    ["/reports", "Reports"],
  ])("can browse %s without write or file controls", async (path, title) => {
    open(path)
    await screen.findByRole("heading", { name: title, level: 1 })
    await at(path)
    for (const name of ["Dashboard", "Customers", "Cases", "Communications", "Reports"])
      expect(screen.getByRole("link", { name })).toBeTruthy()
    for (const name of ["Users", "Settings"])
      expect(screen.queryByRole("link", { name })).toBeNull()
    expect(screen.queryByRole("button", { name: /^(Add Customer|New Customer|Edit|Delete|Create Case|Create New Case|New Case|Edit Case|Close Case|Reopen Case|Submit Update|Log communication)$/i })).toBeNull()
    expect(document.querySelector('input[type="file"]')).toBeNull()
    expect(document.querySelector('a[href^="/api/attachments/"]')).toBeNull()
    expect(document.querySelector('img[src^="/api/attachments/"]')).toBeNull()
    expect((screen.getByRole("button", { name: /Routing Admin/ }) as HTMLButtonElement).disabled).toBe(true)
    expect(vi.mocked(request).mock.calls.every(([, method]) => !method || method === "GET")).toBe(true)
    if (path === "/cases/CASE-1042") {
      expect(screen.getByText(/test.pdf/)).toBeTruthy()
      expect(screen.getByText("Activity Timeline")).toBeTruthy()
      expect(screen.queryByText("Add Progress Update")).toBeNull()
    }
  })

  it.each([
    "/customers/new", "/customers/CUST-001/edit", "/customers/missing/edit",
    "/cases/new", "/cases/new?customerId=CUST-001", "/cases/CASE-1042/edit",
    "/cases/missing/edit", "/users", "/settings", "/SETTINGS/",
  ])("redirects a direct prohibited route %s", async (path) => {
    open(path)
    await at("/dashboard")
    expect(vi.mocked(request).mock.calls.some(([path]) => path === "/users")).toBe(false)
  })

  it("does not restore a write route after login", async () => {
    authenticated = false
    open("/cases/CASE-1042/edit")
    await at("/login")
    await signIn()
    await at("/dashboard")
  })

  it("can log out", async () => {
    open("/customers")
    await userEvent.click(await screen.findByRole("button", { name: "Logout" }))
    await at("/login")
    expect(request).toHaveBeenCalledWith("/auth/logout", "POST")
  })

  it.each(["/customers/new", "/customers/CUST-001/edit", "/cases/new", "/cases/CASE-1042/edit", "/users", "/settings"])("rejects unsafe demo return path %s", (path) => {
    expect(safeReturnPath(path, "Demo Viewer")).toBe("/dashboard")
  })

  it("preserves a read-only deep return path", () => {
    expect(safeReturnPath("/cases/CASE-1042#activity", "Demo Viewer")).toBe("/cases/CASE-1042#activity")
  })
})

describe.each(["Admin", "Support Agent"])("%s permissions remain unchanged", (existingRole) => {
  beforeEach(() => { role = existingRole })
  it("retains customer actions and Settings navigation", async () => {
    open("/customers")
    await screen.findByRole("button", { name: "Add Customer" })
    expect(screen.getAllByTitle("Edit").length).toBeGreaterThan(0)
    expect(screen.getAllByTitle("Delete").length).toBeGreaterThan(0)
    expect(screen.getByRole("link", { name: "Settings" })).toBeTruthy()
    expect(Boolean(screen.queryByRole("link", { name: "Users" }))).toBe(existingRole === "Admin")
  })
  it("retains case actions, uploads and downloads", async () => {
    open("/cases/CASE-1042")
    await screen.findByRole("button", { name: "Edit Case" })
    for (const name of ["Close Case", "Reopen Case", "Submit Update"])
      expect(screen.getByRole("button", { name })).toBeTruthy()
    expect(document.querySelector('input[type="file"]')).toBeTruthy()
    expect(screen.getByRole("link", { name: /test.pdf/ }).getAttribute("href")).toBe("/api/attachments/FILE-test")
  })
  it("retains communication creation", async () => {
    open("/communications")
    await userEvent.click(await screen.findByRole("button", { name: "Log communication" }))
    expect(screen.getByRole("textbox", { name: "Subject" })).toBeTruthy()
  })
  it.each(["/customers/new", "/customers/CUST-001/edit", "/cases/new", "/cases/CASE-1042/edit", "/settings"])("retains direct access to %s", async (path) => {
    open(path)
    await screen.findByRole("link", { name: "Settings" })
    await at(path)
    expect(document.querySelector("form, input")).toBeTruthy()
  })
})
