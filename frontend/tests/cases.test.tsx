import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import Cases from "../src/pages/Cases"
import WorkspaceProvider, { type Workspace } from "../src/data/Workspace"
import type { Case, CasePriority, CaseStatus } from "../src/data/types"

afterEach(cleanup)

function setup() {
  const rows: [CasePriority, CaseStatus, string, string][] = [
    ["High", "Open", "Billing issue", "Alice"],
    ["Medium", "Open", "Billing question", "Alice"],
    ["Low", "Open", "Billing update", "Bob"],
    ["Urgent", "Closed", "Billing escalation", "Alice"],
    ["High", "Closed", "Account issue", "Bob"],
    ["Medium", "Open", "Account question", "Bob"],
  ]
  const cases: Case[] = rows.map(([priority, status, subject, assignedAgent], i) => ({
    id: `CASE-${i + 1}`, customerId: `CUSTOMER-${i + 1}`,
    customerName: `Customer ${i + 1}`, subject, assignedAgent, priority, status,
    category: "Support", description: "", createdDate: "2026-01-01",
    lastUpdated: "2026-01-01",
  }))
  const original = structuredClone(cases)
  cases.forEach(Object.freeze)
  Object.freeze(cases)
  const workspace: Workspace = {
    user: { id: "1", name: "Admin", email: "admin@example.test", role: "Admin", avatarId: null, settings: {} },
    cases, customers: [], communications: [], caseActivities: {},
    agents: ["Alice", "Bob", "Unassigned Agent"], categories: [], attachments: [],
  }
  render(<WorkspaceProvider initial={workspace}><Cases onCreateCase={() => {}} onViewCase={() => {}} /></WorkspaceProvider>)
  const user = userEvent.setup()
  const [status, priority, agent] = screen.getAllByRole("combobox")
  const select = (control: HTMLElement, label: string) =>
    user.selectOptions(control, within(control).getByRole("option", { name: label, exact: true }))
  function expectCases(ids: number[]) {
    expect(screen.getByText(`${ids.length} cases found`)).toBeTruthy()
    const body = screen.getAllByRole("rowgroup")[1]
    if (ids.length === 0) {
      expect(within(body).getByText("No cases match the current filters.")).toBeTruthy()
    } else {
      expect(within(body).getAllByRole("row").map(row => within(row).getAllByRole("cell")[0].textContent))
        .toEqual(ids.map(id => `CASE-${id}`))
    }
    expect(cases).toEqual(original)
    expect(workspace.cases).toBe(cases)
  }
  return { user, status, priority, agent, select, expectCases }
}

describe("Cases filters", () => {
  it.each([
    ["Open", [1, 2, 3, 6]],
    ["In Progress", []],
    ["Pending", []],
    ["Resolved", []],
    ["Closed", [4, 5]],
  ] as [string, number[]][])("restores Status: All after %s, including empty results", async (label, ids) => {
    const { status, select, expectCases } = setup()
    for (let i = 0; i < 2; i++) {
      await select(status, label)
      expectCases(ids)
      await select(status, "Status: All")
      expectCases([1, 2, 3, 4, 5, 6])
    }
  })

  it.each([
    ["Alice", [1, 2, 4]],
    ["Bob", [3, 5, 6]],
    ["Unassigned Agent", []],
  ] as [string, number[]][])("restores Agent: All after %s, including empty results", async (label, ids) => {
    const { agent, select, expectCases } = setup()
    await select(agent, label)
    expectCases(ids)
    await select(agent, "Agent: All")
    expectCases([1, 2, 3, 4, 5, 6])
  })

  it("recovers from empty combinations while preserving the remaining filters", async () => {
    const { user, status, priority, agent, select, expectCases } = setup()
    await user.type(screen.getByRole("textbox"), "billing")
    await select(agent, "Alice")
    await select(status, "Open")
    await select(priority, "Urgent")
    expectCases([])
    await select(priority, "Priority: All")
    expectCases([1, 2])
    await select(status, "Pending")
    expectCases([])
    await select(status, "Status: All")
    expectCases([1, 2, 4])
    await select(agent, "Unassigned Agent")
    expectCases([])
    await select(agent, "Agent: All")
    expectCases([1, 2, 3, 4])
    await user.type(screen.getByRole("textbox"), " nonexistent")
    expectCases([])
    await user.clear(screen.getByRole("textbox"))
    expectCases([1, 2, 3, 4, 5, 6])
  })

  it("restores the original cases through repeated All → High → Medium → All changes", async () => {
    const { priority, select, expectCases } = setup()
    expectCases([1, 2, 3, 4, 5, 6])
    for (let i = 0; i < 3; i++) {
      await select(priority, "High")
      expectCases([1, 5])
      await select(priority, "Medium")
      expectCases([2, 6])
      await select(priority, "Priority: All")
      expectCases([1, 2, 3, 4, 5, 6])
    }
    await select(priority, "Low")
    expectCases([3])
    await select(priority, "Urgent")
    expectCases([4])
    await select(priority, "Priority: All")
    expectCases([1, 2, 3, 4, 5, 6])
  })

  it("combines priority with Status, Search, and Agent and restores their All options", async () => {
    const { user, status, priority, agent, select, expectCases } = setup()
    await select(status, "Open")
    await user.type(screen.getByRole("textbox"), "BILLING")
    expectCases([1, 2, 3])
    await select(priority, "High")
    expectCases([1])
    await select(priority, "Medium")
    expectCases([2])
    await select(priority, "Priority: All")
    expectCases([1, 2, 3])
    await select(agent, "Alice")
    expectCases([1, 2])
    await select(priority, "High")
    expectCases([1])
    await select(priority, "Priority: All")
    expectCases([1, 2])
    await select(status, "Status: All")
    expectCases([1, 2, 4])
    await select(agent, "Agent: All")
    expectCases([1, 2, 3, 4])
    await user.clear(screen.getByRole("textbox"))
    expectCases([1, 2, 3, 4, 5, 6])
  })
})
