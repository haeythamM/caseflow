import { afterEach, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import Login from "../src/pages/Login"

afterEach(cleanup)

it("exposes labelled login fields and an accessible password visibility control", async () => {
  const user = userEvent.setup()
  render(<Login onLogin={vi.fn()} />)
  expect(screen.getByLabelText("Email address").getAttribute("autocomplete")).toBe("username")
  const password = screen.getByLabelText("Password")
  expect(password.getAttribute("type")).toBe("password")
  await user.click(screen.getByRole("button", { name: "Show password" }))
  expect(password.getAttribute("type")).toBe("text")
  expect(screen.getByRole("button", { name: "Hide password" }).getAttribute("aria-pressed")).toBe("true")
})
