import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createServer } from "vite"
import { createElement } from "react"
import { renderToString } from "react-dom/server"
import { MemoryRouter } from "react-router-dom"

const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
})
try {
  const { default: Provider } = await server.ssrLoadModule(
    "/src/data/Workspace.tsx",
  )
  const demo = JSON.parse(
    readFileSync(
      new URL("../../backend/tests/fixtures/workspace.json", import.meta.url),
      "utf8",
    ),
  )
  const user = {
    id: "USER-TEST",
    name: "Test Agent",
    email: "test@example.test",
    role: "Support Agent",
    avatarId: null,
    settings: {},
  }
  const workspaces = [
    { ...demo, user, attachments: [] },
    {
      customers: [],
      cases: [],
      communications: [],
      caseActivities: {},
      agents: [],
      categories: [],
      attachments: [],
      user,
    },
  ]
  let count = 0
  for (const workspace of workspaces)
    for (const name of [
      "Dashboard",
      "Customers",
      "CustomerForm",
      "CustomerProfile",
      "Cases",
      "CreateCase",
      "CaseDetails",
      "Communications",
      "Reports",
      "Settings",
      "Users",
      "Login",
      "About",
    ]) {
      const { default: Page } = await server.ssrLoadModule(
        `/src/pages/${name}.tsx`,
      )
      const props = {
        customerId: "CUST-001",
        caseId: "CASE-1042",
        onNavigate() {},
        onViewCase() {},
        onAddCustomer() {},
        onViewCustomer() {},
        onEditCustomer() {},
        onCreateCase() {},
        onSave() {},
        onCancel() {},
        onBack() {},
        onEdit() {},
      }
      const html = renderToString(
        createElement(
          Provider,
          { initial: workspace },
          createElement(Page, props),
        ),
      )
      assert.ok(html.length > 0, `${name} renders`)
      assert.ok(!html.includes("NaN"), `${name} has no NaN indicators`)
      count++
    }
  const { default: Sidebar } = await server.ssrLoadModule(
    "/src/components/Sidebar.tsx",
  )
  for (const role of ["Admin", "Support Agent"]) {
    const html = renderToString(
      createElement(
        MemoryRouter,
        { initialEntries: ["/users"] },
        createElement(
          Provider,
          {
            initial: { ...workspaces[1], user: { ...user, role } },
          },
          createElement(Sidebar, {
            collapsed: false,
            onNavigate() {},
            onLogout() {},
            onToggle() {},
          }),
        ),
      ),
    )
    const buttons = html.match(/<a\b[\s\S]*?<\/a>/g) ?? []
    const usersButton = buttons.find((button) =>
      button.includes("<span>Users</span>"),
    )
    assert.equal(
      Boolean(usersButton),
      role === "Admin",
      `Users visibility for ${role}`,
    )
    if (usersButton) {
      assert.ok(usersButton.includes("bg-blue-600"), "Users is active")
      assert.ok(
        !buttons
          .find((button) => button.includes("<span>Cases</span>"))
          ?.includes("bg-blue-600"),
        "Cases is inactive",
      )
    }
  }
  console.log(
    "Passed Sidebar Admin/Support Agent visibility and active-state checks.",
  )
  console.log(
    `Passed ${count} page render checks with demo and empty workspaces. This is not a browser interaction test.`,
  )
} finally {
  await server.close()
}
