import { useWorkspace } from "../data/Workspace"
import { StatusBadge, PriorityBadge } from "../components/StatusBadge"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"

interface DashboardProps {
  onNavigate: (page: string) => void
  onViewCase: (caseId: string) => void
}

const cardStyles = [
  {
    label: "Total Customers",
    color: "text-blue-600",
    bg: "bg-blue-50",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  },
  {
    label: "Open Cases",
    color: "text-violet-600",
    bg: "bg-violet-50",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  },
  {
    label: "Pending Cases",
    color: "text-amber-600",
    bg: "bg-amber-50",
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    label: "Resolved Cases",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  },
]

export default function Dashboard({ onNavigate, onViewCase }: DashboardProps) {
  const { readOnly, cases, customers } = useWorkspace()
  const statCards = cardStyles.map((card, index) => ({
    ...card,
    value: String(
      index === 0
        ? customers.length
        : cases.filter(
            (c) => c.status === ["", "Open", "Pending", "Resolved"][index],
          ).length,
    ),
    sub:
      index === 0
        ? "All customers"
        : index === 1
          ? cases.filter(
              (c) =>
                c.priority === "Urgent" &&
                !["Closed", "Resolved"].includes(c.status),
            ).length + " urgent active"
          : index === 2
            ? "Awaiting response"
            : "All time",
  }))
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setUTCDate(date.getUTCDate() - 6 + i)
    const key = date.toISOString().slice(0, 10)
    return {
      name: date.toLocaleDateString("en", {
        weekday: "short",
        timeZone: "UTC",
      }),
      cases: cases.filter((c) => c.createdDate.startsWith(key)).length,
    }
  })
  const recentCases = cases.slice(0, 5)

  return (
    <div className="p-6 space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl border border-slate-200 p-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {s.label}
                </p>
                <p className={`font-display font-700 text-3xl mt-1 ${s.color}`}>
                  {s.value}
                </p>
                <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
              </div>
              <div
                className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center`}
              >
                <svg
                  className={`w-5 h-5 ${s.color}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.75}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d={s.icon}
                  />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent cases */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-display font-600 text-slate-800">
              Recent Cases
            </h2>
            <button
              onClick={() => onNavigate("cases")}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              View all →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">
                    Case
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                    Customer
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                    Priority
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentCases.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                    onClick={() => onViewCase(c.id)}
                  >
                    <td className="px-6 py-3.5">
                      <span className="font-mono text-xs text-slate-500">
                        {c.id}
                      </span>
                      <p className="text-slate-800 font-medium text-sm mt-0.5 truncate max-w-[200px]">
                        {c.subject}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {c.customerName}
                    </td>
                    <td className="px-4 py-3.5">
                      <PriorityBadge priority={c.priority} />
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Chart + quick actions */}
        <div className="space-y-4">
          {/* Cases this week */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-display font-600 text-slate-800 mb-4 text-sm">
              Cases — Last 7 Days
            </h3>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={chartData} barSize={12}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: "#f1f5f9" }}
                  contentStyle={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    fontSize: "12px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.07)",
                  }}
                />
                <Bar dataKey="cases" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={i === 3 ? "#2563eb" : "#bfdbfe"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Quick actions */}
          {!readOnly && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-display font-600 text-slate-800 mb-3 text-sm">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => onNavigate("create-case")}
                  className="w-full flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
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
                  Create New Case
                </button>
                <button
                  onClick={() => onNavigate("customer-form")}
                  className="w-full flex items-center gap-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
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
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    />
                  </svg>
                  Add Customer
                </button>
              </div>
            </div>
          )}

          {/* Status overview */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-display font-600 text-slate-800 mb-3 text-sm">
              Case Status Overview
            </h3>
            <div className="space-y-2.5">
              {([
                "Open",
                "In Progress",
                "Pending",
                "Resolved",
                "Closed",
              ] as const).map((s) => {
                const count = cases.filter((c) => c.status === s).length
                const pct = Math.round(
                  (count / Math.max(cases.length, 1)) * 100,
                )
                const barColor: Record<string, string> = {
                  Open: "bg-blue-500",
                  "In Progress": "bg-violet-500",
                  Pending: "bg-amber-500",
                  Resolved: "bg-emerald-500",
                  Closed: "bg-slate-400",
                }
                return (
                  <div key={s}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-600">{s}</span>
                      <span className="text-slate-400 font-mono">{count}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full">
                      <div
                        className={`h-full rounded-full ${barColor[s]} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
