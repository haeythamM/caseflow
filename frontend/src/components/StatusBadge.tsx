import type { CaseStatus, CasePriority, CustomerStatus } from "../data/types"

const statusColors: Record<CaseStatus, string> = {
  Open: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  "In Progress": "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  Pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  Resolved: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  Closed: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
}

const priorityColors: Record<CasePriority, string> = {
  Low: "bg-slate-50 text-slate-600 ring-1 ring-slate-200",
  Medium: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  High: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  Urgent: "bg-red-50 text-red-700 ring-1 ring-red-200",
}

const customerStatusColors: Record<CustomerStatus, string> = {
  Active: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  Inactive: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
  Suspended: "bg-red-50 text-red-700 ring-1 ring-red-200",
}

export function StatusBadge({ status }: { status: CaseStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[status]}`}
    >
      {status}
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: CasePriority }) {
  const dots: Record<CasePriority, string> = {
    Low: "bg-slate-400",
    Medium: "bg-sky-500",
    High: "bg-orange-500",
    Urgent: "bg-red-500",
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${priorityColors[priority]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dots[priority]}`} />
      {priority}
    </span>
  )
}

export function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${customerStatusColors[status]}`}
    >
      {status}
    </span>
  )
}
