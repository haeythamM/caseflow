export const isDemoViewer = (role: string) => role === "Demo Viewer"

// Paths here are the registered route patterns, not untrusted browser URLs.
export function canAccessPage(path: string, role: string) {
  if (!["Admin", "Support Agent", "Demo Viewer"].includes(role)) return false
  if (path === "/users") return role === "Admin"
  if (!isDemoViewer(role)) return true
  return [
    "/dashboard", "/customers", "/customers/:customerId",
    "/cases", "/cases/:caseId", "/communications", "/reports",
    "/about",
  ].includes(path)
}
