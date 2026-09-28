import { canAccessPage } from "./permissions"
import { matchPath } from "react-router-dom"

export const protectedRoutes = [
  { path: "/dashboard", title: "Dashboard" },
  { path: "/customers", title: "Customers" },
  { path: "/customers/new", title: "Customer" },
  { path: "/customers/:customerId/edit", title: "Edit Customer" },
  { path: "/customers/:customerId", title: "Customer Profile" },
  { path: "/cases", title: "Cases" },
  { path: "/cases/new", title: "Create Case" },
  { path: "/cases/:caseId/edit", title: "Edit Case" },
  { path: "/cases/:caseId", title: "Case Details" },
  { path: "/communications", title: "Communications" },
  { path: "/reports", title: "Reports" },
  { path: "/users", title: "Users" },
  { path: "/settings", title: "Settings" },
  { path: "/about", title: "About CaseFlow" },
] as const

export function routeTitle(pathname: string) {
  if (matchPath("/login", pathname)) return "Sign in"
  return (
    protectedRoutes.find((route) => matchPath(route.path, pathname))?.title ??
    "Page not found"
  )
}

export const customerPath = (id: string) =>
  `/customers/${encodeURIComponent(id)}`
export const casePath = (id: string) => `/cases/${encodeURIComponent(id)}`

// Preserve existing Dashboard/Navbar callbacks; navigation itself uses URLs.
export function navigationPath(
  name: string,
  params: Record<string, string> = {},
) {
  switch (name) {
    case "customer-profile":
      return customerPath(params.customerId)
    case "customer-form":
      return params.customerId
        ? `${customerPath(params.customerId)}/edit`
        : "/customers/new"
    case "case-details":
      return casePath(params.caseId)
    case "create-case":
      return params.caseId
        ? `${casePath(params.caseId)}/edit`
        : `/cases/new${
            params.customerId
              ? `?${new URLSearchParams({ customerId: params.customerId })}`
              : ""
          }`
    default:
      return protectedRoutes.some((route) => route.path === `/${name}`)
        ? `/${name}`
        : "/dashboard"
  }
}

export function safeReturnPath(from: unknown, role: string) {
  if (
    typeof from !== "string" ||
    !from.startsWith("/") ||
    from.startsWith("//") ||
    /[\\\u0000-\u0020]/.test(from)
  )
    return "/dashboard"
  const url = new URL(from, "https://caseflow.invalid")
  const route = protectedRoutes.find((route) =>
    matchPath(route.path, url.pathname),
  )
  if (
    url.origin !== "https://caseflow.invalid" ||
    !route ||
    !canAccessPage(route.path, role)
  )
    return "/dashboard"
  return `${url.pathname}${url.search}${url.hash}`
}
