import { useWorkspace } from "../data/Workspace"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts"

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: ReadonlyArray<{ value?: number | string }>
  label?: string | number
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow text-xs">
      <p className="font-medium text-slate-800">{label}</p>
      <p className="text-slate-600 mt-0.5">{payload[0].value} cases</p>
    </div>
  )
}

export default function Reports() {
  const { cases } = useWorkspace()
  const resolved = cases.filter((c) => c.resolvedAt)
  const statusData = [
    {
      name: "Open",
      value: cases.filter((c) => c.status === "Open").length,
      color: "#3b82f6",
    },
    {
      name: "In Progress",
      value: cases.filter((c) => c.status === "In Progress").length,
      color: "#8b5cf6",
    },
    {
      name: "Pending",
      value: cases.filter((c) => c.status === "Pending").length,
      color: "#f59e0b",
    },
    {
      name: "Resolved",
      value: cases.filter((c) => c.status === "Resolved").length,
      color: "#10b981",
    },
    {
      name: "Closed",
      value: cases.filter((c) => c.status === "Closed").length,
      color: "#94a3b8",
    },
  ]

  const priorityData = [
    {
      name: "Urgent",
      value: cases.filter((c) => c.priority === "Urgent").length,
    },
    { name: "High", value: cases.filter((c) => c.priority === "High").length },
    {
      name: "Medium",
      value: cases.filter((c) => c.priority === "Medium").length,
    },
    { name: "Low", value: cases.filter((c) => c.priority === "Low").length },
  ]

  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = new Date()
    date.setUTCDate(1)
    date.setUTCMonth(date.getUTCMonth() - 5 + i)
    const key = date.toISOString().slice(0, 7)
    return {
      month: date.toLocaleDateString("en", { month: "short", timeZone: "UTC" }),
      cases: cases.filter((c) => c.createdDate.startsWith(key)).length,
    }
  })

  const priorityColors: Record<string, string> = {
    Urgent: "#ef4444",
    High: "#f97316",
    Medium: "#3b82f6",
    Low: "#94a3b8",
  }

  const stats = [
    {
      label: "Total Cases",
      value: cases.length,
      sub: "All time",
      color: "text-slate-800",
    },
    {
      label: "Open + In Progress",
      value: cases.filter(
        (c) => c.status === "Open" || c.status === "In Progress",
      ).length,
      sub: "Active workload",
      color: "text-blue-600",
    },
    {
      label: "Resolved",
      value: cases.filter((c) => c.status === "Resolved").length,
      sub: "All time",
      color: "text-emerald-600",
    },
    {
      label: "Avg Resolution Time",
      value: resolved.length
        ? (
            resolved.reduce(
              (sum, c) =>
                sum +
                (new Date(c.resolvedAt!.replace(" ", "T") + "Z").getTime() -
                  new Date(c.createdDate.replace(" ", "T") + "Z").getTime()) /
                  86400000,
              0,
            ) / resolved.length
          ).toFixed(1) + " days"
        : "—",
      sub: "Resolved / closed cases",
      color: "text-violet-600",
    },
    {
      label: "Cases This Month",
      value: monthlyData[5].cases,
      sub: "Current month (UTC)",
      color: "text-amber-600",
    },
    {
      label: "Unassigned",
      value: cases.filter((c) => !c.assignedAgent).length,
      sub: "Awaiting assignment",
      color: "text-pink-600",
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl border border-slate-200 p-4"
          >
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider leading-tight">
              {s.label}
            </p>
            <p className={`font-display font-700 text-2xl mt-2 ${s.color}`}>
              {s.value}
            </p>
            <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Monthly trend */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-display font-600 text-slate-800 text-sm mb-4">
            Cases Created — Last 6 Months
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} barSize={28}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "#f8fafc" }}
              />
              <Bar dataKey="cases" radius={[5, 5, 0, 0]}>
                {monthlyData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={i === monthlyData.length - 1 ? "#bfdbfe" : "#2563eb"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status pie */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-display font-600 text-slate-800 text-sm mb-4">
            Cases by Status
          </h3>
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="h-40 w-40 max-w-full shrink-0 sm:h-[180px] sm:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    // Preserve the 45/80px desktop radii within the 85px available radius.
                    innerRadius={`${(45 / 85) * 100}%`}
                    outerRadius={`${(80 / 85) * 100}%`}
                    paddingAngle={3}
                  >
                    {statusData.map((s, i) => (
                      <Cell key={i} fill={s.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full min-w-0 space-y-2 sm:w-auto sm:flex-1">
              {statusData.map((s) => (
                <div key={s.name} className="flex items-center gap-2 text-sm">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-slate-600 flex-1">{s.name}</span>
                  <span className="font-medium text-slate-800">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Priority */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-display font-600 text-slate-800 text-sm mb-4">
            Cases by Priority
          </h3>
          <div className="space-y-3">
            {priorityData.map((p) => {
              const pct = Math.round(
                (p.value / Math.max(cases.length, 1)) * 100,
              )
              return (
                <div key={p.name}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-slate-600">{p.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{pct}%</span>
                      <span className="font-medium text-slate-800 w-4 text-right">
                        {p.value}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: priorityColors[p.name],
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Open vs closed */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-display font-600 text-slate-800 text-sm mb-4">
            Open vs. Closed
          </h3>
          <div className="flex flex-wrap items-center gap-8 mb-6">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">
                Open / Active
              </p>
              <p className="font-display font-700 text-3xl text-blue-600 mt-1">
                {
                  cases.filter((c) =>
                    ["Open", "In Progress", "Pending"].includes(c.status),
                  ).length
                }
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">
                Resolved / Closed
              </p>
              <p className="font-display font-700 text-3xl text-emerald-600 mt-1">
                {
                  cases.filter((c) => ["Resolved", "Closed"].includes(c.status))
                    .length
                }
              </p>
            </div>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{
                width: `${Math.round((cases.filter((c) => ["Open", "In Progress", "Pending"].includes(c.status)).length / Math.max(cases.length, 1)) * 100)}%`,
              }}
            />
            <div className="h-full bg-emerald-500 flex-1" />
          </div>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Active
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Closed
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
