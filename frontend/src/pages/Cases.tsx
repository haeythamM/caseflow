import { useState } from "react"
import { useWorkspace } from "../data/Workspace"
import { StatusBadge, PriorityBadge } from "../components/StatusBadge"

interface CasesProps {
  onCreateCase: () => void
  onViewCase: (id: string) => void
}

export default function Cases({ onCreateCase, onViewCase }: CasesProps) {
  const { readOnly, cases, agents, formatDate } = useWorkspace()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [priorityFilter, setPriorityFilter] = useState("All")
  const [agentFilter, setAgentFilter] = useState("All")
  const [page, setPage] = useState(1)
  const perPage = 6

  const filtered = cases.filter((c) => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      `${c.id} ${c.customerName} ${c.subject} ${c.assignedAgent}`
        .toLowerCase()
        .includes(q)
    const matchStatus = statusFilter === "All" || c.status === statusFilter
    const matchPriority =
      priorityFilter === "All" || c.priority === priorityFilter
    const matchAgent = agentFilter === "All" || c.assignedAgent === agentFilter
    return matchSearch && matchStatus && matchPriority && matchAgent
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-slate-500 flex-1">
          {filtered.length} cases found
        </p>
        {!readOnly && (
          <button
            onClick={onCreateCase}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create Case
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            placeholder="Search cases…"
          />
        </div>
        {[
          {
            label: "Status",
            value: statusFilter,
            set: setStatusFilter,
            opts: [
              "All",
              "Open",
              "In Progress",
              "Pending",
              "Resolved",
              "Closed",
            ],
          },
          {
            label: "Priority",
            value: priorityFilter,
            set: setPriorityFilter,
            opts: ["All", "Low", "Medium", "High", "Urgent"],
          },
          {
            label: "Agent",
            value: agentFilter,
            set: setAgentFilter,
            opts: ["All", ...agents],
          },
        ].map((f) => (
          <select
            key={f.label}
            value={f.value}
            onChange={(e) => {
              f.set(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-blue-400 bg-white"
          >
            {f.opts.map((o) => (
              <option key={o} value={o}>{o === "All" ? `${f.label}: All` : o}</option>
            ))}
          </select>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                {[
                  "Case ID",
                  "Customer",
                  "Subject",
                  "Agent",
                  "Priority",
                  "Status",
                  "Last Updated",
                  "",
                ].map((h, i) => (
                  <th
                    key={i}
                    className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-5 py-4 font-mono text-xs text-slate-500">
                    {c.id}
                  </td>
                  <td className="px-5 py-4 text-slate-700">{c.customerName}</td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => onViewCase(c.id)}
                      className="text-slate-800 font-medium hover:text-blue-600 transition-colors text-left max-w-[220px] truncate block"
                    >
                      {c.subject}
                    </button>
                  </td>
                  <td className="px-5 py-4 text-slate-600 whitespace-nowrap">
                    {c.assignedAgent}
                  </td>
                  <td className="px-5 py-4">
                    <PriorityBadge priority={c.priority} />
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                    {formatDate(c.lastUpdated)}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => onViewCase(c.id)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
                    >
                      View →
                    </button>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-12 text-center text-slate-400 text-sm"
                  >
                    No cases match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex flex-wrap gap-3 items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex flex-wrap gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 text-xs rounded border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                    page === i + 1
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-xs rounded border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
