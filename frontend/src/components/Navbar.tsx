import { useState } from "react"
import { useWorkspace } from "../data/Workspace"
import UserAvatar from "./UserAvatar"

interface NavbarProps {
  pageTitle: string
  onMobileMenuOpen: () => void
  onNavigate: (page: string, params?: Record<string, string>) => void
}

export default function Navbar({
  pageTitle,
  onMobileMenuOpen,
  onNavigate,
}: NavbarProps) {
  const { user, readOnly, cases, customers, caseActivities, formatDate } = useWorkspace()
  const [notifOpen, setNotifOpen] = useState(false)
  const [search, setSearch] = useState("")
  const query = search.trim().toLowerCase()
  const preferences = user.settings.notifications
  const activity = Object.entries(caseActivities)
    .flatMap(([caseId, rows]) => rows.map((row) => ({ ...row, caseId })))
    .filter((a) => {
      const ownCase = cases.some(
        (c) => c.id === a.caseId && c.assignedAgent === user.name,
      )
      return (
        (preferences?.digest ?? true) ||
        (ownCase &&
          ((a.type === "assigned" && preferences?.caseAssigned) ||
            (a.type === "status_change" && preferences?.caseResolved) ||
            preferences?.caseUpdated))
      )
    })
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)
  const results = query
    ? [
        ...cases
          .filter((c) =>
            `${c.id} ${c.subject} ${c.customerName}`
              .toLowerCase()
              .includes(query),
          )
          .map((c) => ({
            id: c.id,
            label: c.subject,
            page: "case-details",
            params: { caseId: c.id } as Record<string, string>,
          })),
        ...customers
          .filter((c) =>
            `${c.firstName} ${c.lastName} ${c.email}`
              .toLowerCase()
              .includes(query),
          )
          .map((c) => ({
            id: c.id,
            label: `${c.firstName} ${c.lastName}`,
            page: "customer-profile",
            params: { customerId: c.id } as Record<string, string>,
          })),
      ].slice(0, 8)
    : []
  return (
    <header className="relative min-h-16 bg-white border-b border-slate-200 flex flex-wrap items-center gap-3 px-4 py-3 xl:px-6 xl:py-0 xl:h-16 shrink-0">
      <button
        aria-label="Open menu"
        className="md:hidden shrink-0 p-2"
        onClick={onMobileMenuOpen}
      >
        ☰
      </button>
      <h1 className="shrink-0 whitespace-nowrap font-display font-semibold text-lg text-slate-800">
        {pageTitle}
      </h1>
      <div className="xl:relative order-last w-full min-w-0 xl:order-none xl:w-64 xl:ml-4">
        <input
          aria-label="Search cases and customers"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search cases, customers…"
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm w-full"
        />
        {query && (
          <div className="absolute left-4 right-4 top-full xl:left-auto xl:right-auto xl:top-11 xl:w-80 max-h-[min(50dvh,calc(100dvh-100%-1rem))] overflow-y-auto wrap-anywhere z-50 bg-white border rounded-xl shadow-lg">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  onNavigate(r.page, r.params)
                  setSearch("")
                }}
                className="block text-left w-full px-4 py-3 hover:bg-slate-50 text-sm"
              >
                <span className="block text-xs text-slate-400">{r.id}</span>
                {r.label}
              </button>
            ))}
            {!results.length && (
              <p className="p-4 text-sm text-slate-500">No results.</p>
            )}
          </div>
        )}
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="xl:relative">
          <button
            aria-label="Recent notifications"
            onClick={() => setNotifOpen(!notifOpen)}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            Activity
          </button>
          {notifOpen && (
            <div className="absolute right-4 top-full w-80 max-w-[calc(100vw-2rem)] max-h-[min(50dvh,calc(100dvh-100%-1rem))] overflow-y-auto wrap-anywhere xl:right-0 xl:top-11 bg-white rounded-xl shadow-lg border z-50">
              <h2 className="px-4 py-3 border-b font-semibold text-sm">
                Recent activity
              </h2>
              {!activity.length && (
                <p className="p-4 text-sm text-slate-500">No activity yet.</p>
              )}
              {activity.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    onNavigate("case-details", { caseId: a.caseId })
                    setNotifOpen(false)
                  }}
                  className="text-left block w-full px-4 py-3 border-b hover:bg-slate-50"
                >
                  <p className="text-sm line-clamp-2">{a.text}</p>
                  <p className="text-xs text-slate-400">
                    {a.agent} · {formatDate(a.date)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          disabled={readOnly}
          onClick={() => onNavigate("settings")}
          className="flex items-center gap-2.5 text-left min-w-0 max-w-44"
        >
          <span className="w-8 h-8 shrink-0 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm overflow-hidden">
            <UserAvatar
              userId={user.id}
              avatarId={readOnly ? null : user.avatarId}
              alt="Profile"
              className="w-full h-full object-cover"
              fallback={
                user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
              }
            />
          </span>
          <span className="min-w-0 wrap-anywhere">
            <span className="block text-sm font-medium">{user.name}</span>
            <span className="block text-xs text-slate-400">{user.role}</span>
          </span>
        </button>
      </div>
    </header>
  )
}
