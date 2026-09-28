import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import Users from "../src/pages/Users"
import UserAvatar from "../src/components/UserAvatar"
import { request } from "../src/lib/api"

vi.mock("../src/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/api")>()),
  request: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(request).mockResolvedValue([
    { id: "USER-42", name: "Alice Admin", email: "alice@example.test", role: "Admin", avatarId: "FILE-99", createdAt: "2026-01-01" },
    { id: "USER-43", name: "Bob Agent", email: "bob@example.test", role: "Support Agent", avatarId: null, createdAt: "2026-01-01" },
  ])
})
afterEach(cleanup)

describe("Admin Users avatars", () => {
  it("uses the user ID endpoint rather than the attachment ID", async () => {
    const { container } = render(<Users />)
    const image = await screen.findByRole("img", { name: "Alice Admin" })
    expect(request).toHaveBeenCalledWith("/users")
    expect(image.getAttribute("src")).toBe("/api/users/USER-42/avatar")
    expect(container.querySelector('img[src*="FILE-99"]')).toBeNull()
    expect(container.querySelector('img[src^="/api/attachments/"]')).toBeNull()
  })

  it("keeps initials and user details for users without avatars", async () => {
    render(<Users />)
    const row = (await screen.findByText("Bob Agent")).closest("tr")!
    expect(within(row).getByText("BA")).toBeTruthy()
    expect(within(row).getByText("bob@example.test")).toBeTruthy()
    expect(within(row).getByText("Support Agent")).toBeTruthy()
    expect(within(row).queryByRole("img")).toBeNull()
  })

  it("removes a failed image and shows initials (including the error event from a 404)", async () => {
    render(<Users />)
    const image = await screen.findByRole("img", { name: "Alice Admin" })
    fireEvent.error(image)
    const row = screen.getByText("Alice Admin").closest("tr")!
    expect(within(row).queryByRole("img")).toBeNull()
    expect(within(row).getByText("AA")).toBeTruthy()
    expect(screen.getByText("BA")).toBeTruthy()
  })
})

it("retries the shared avatar when the user or avatar changes after an error", () => {
  const props = { userId: "USER-42", avatarId: "FILE-99", alt: "Profile", className: "rounded-full", fallback: "AA" }
  const { rerender } = render(<UserAvatar {...props} />)
  fireEvent.error(screen.getByRole("img"))
  expect(screen.queryByRole("img")).toBeNull()
  rerender(<UserAvatar {...props} avatarId="FILE-new" />)
  expect(screen.getByRole("img").getAttribute("src")).toBe("/api/users/USER-42/avatar")
  fireEvent.error(screen.getByRole("img"))
  rerender(<UserAvatar {...props} userId="USER-43" />)
  expect(screen.getByRole("img").getAttribute("src")).toBe("/api/users/USER-43/avatar")
})
