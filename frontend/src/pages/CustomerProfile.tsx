import { useState } from "react"
import { useWorkspace } from "../data/Workspace"
import {
  CustomerStatusBadge,
  StatusBadge,
  PriorityBadge,
} from "../components/StatusBadge"

interface CustomerProfileProps {
  customerId: string
  onBack: () => void
  onEditCustomer: (id: string) => void
  onCreateCase: () => void
  onViewCase: (id: string) => void
}

export default function CustomerProfile({
  customerId,
  onBack,
  onEditCustomer,
  onCreateCase,
  onViewCase,
}: CustomerProfileProps) {
  const { readOnly, customers, cases, communications, formatDate } = useWorkspace()
  const [tab, setTab] =
    useState<"overview" | "cases" | "communications" | "notes">("overview")
  const customer = customers.find((c) => c.id === customerId)
  if (!customer)
    return <div className="p-6 text-slate-500">Customer not found.</div>

  const customerCases = cases.filter((c) => c.customerId === customerId)
  const customerComms = communications.filter(
    (c) => c.customerId === customerId,
  )
  const tabs = ["overview", "cases", "communications", "notes"] as const

  return (
    <div className="p-4 md:p-6 space-y-5 wrap-anywhere">
      {/* Back + actions */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          aria-label="Back to customers"
          onClick={onBack}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </button>
        <span className="text-sm text-slate-400">Customers</span>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-700">
          {customer.firstName} {customer.lastName}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          {!readOnly && (
            <button
              onClick={onCreateCase}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
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
              New Case
            </button>
          )}
          {!readOnly && (
            <button
              onClick={() => onEditCustomer(customerId)}
              className="flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
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
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Profile header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-display font-700 text-xl shrink-0">
            {customer.firstName[0]}
            {customer.lastName[0]}
          </div>
          <div className="flex-1 min-w-0 w-full">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="font-display font-700 text-xl text-slate-900">
                {customer.firstName} {customer.lastName}
              </h2>
              <CustomerStatusBadge status={customer.status} />
              <span className="font-mono text-xs text-slate-400">
                {customer.id}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-2 text-sm">
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider font-medium">
                  Email
                </p>
                <p className="text-slate-700 mt-0.5">{customer.email}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider font-medium">
                  Phone
                </p>
                <p className="text-slate-700 mt-0.5">{customer.phone}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider font-medium">
                  Location
                </p>
                <p className="text-slate-700 mt-0.5">
                  {customer.city}, {customer.province}, {customer.country}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider font-medium">
                  Customer Since
                </p>
                <p className="text-slate-700 mt-0.5">
                  {formatDate(customer.createdDate)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex flex-wrap gap-0">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-3 text-sm font-medium capitalize border-b-2 -mb-px transition-colors
              ${
                tab === t
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
          >
            {t}
            {t === "cases" && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full">
                {customerCases.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-display font-600 text-slate-800 mb-3 text-sm pb-2 border-b border-slate-100">
              Contact Information
            </h3>
            <dl className="space-y-2.5 text-sm">
              {[
                ["Full Name", `${customer.firstName} ${customer.lastName}`],
                ["Email", customer.email],
                ["Phone", customer.phone],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-4">
                  <dt className="text-slate-400 w-24 shrink-0">{k}</dt>
                  <dd className="text-slate-700">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-display font-600 text-slate-800 mb-3 text-sm pb-2 border-b border-slate-100">
              Address
            </h3>
            <dl className="space-y-2.5 text-sm">
              {[
                ["Street", customer.address],
                ["City", customer.city],
                ["Province", customer.province],
                ["Postal", customer.postalCode],
                ["Country", customer.country],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-4">
                  <dt className="text-slate-400 w-24 shrink-0">{k}</dt>
                  <dd className="text-slate-700">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 md:col-span-2">
            <h3 className="font-display font-600 text-slate-800 mb-3 text-sm pb-2 border-b border-slate-100">
              Account Stats
            </h3>
            <div className="flex flex-wrap gap-8 text-sm">
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider">
                  Total Cases
                </p>
                <p className="font-display font-700 text-2xl text-slate-900 mt-1">
                  {customer.casesCount}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider">
                  Open Cases
                </p>
                <p className="font-display font-700 text-2xl text-blue-600 mt-1">
                  {
                    customerCases.filter(
                      (c) => c.status === "Open" || c.status === "In Progress",
                    ).length
                  }
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider">
                  Status
                </p>
                <div className="mt-2">
                  <CustomerStatusBadge status={customer.status} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "cases" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                {[
                  "Case ID",
                  "Subject",
                  "Agent",
                  "Priority",
                  "Status",
                  "Last Updated",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customerCases.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-slate-50/50 cursor-pointer"
                  onClick={() => onViewCase(c.id)}
                >
                  <td className="px-5 py-4 font-mono text-xs text-slate-500">
                    {c.id}
                  </td>
                  <td className="px-5 py-4 text-slate-800 font-medium max-w-xs truncate">
                    {c.subject}
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {c.assignedAgent}
                  </td>
                  <td className="px-5 py-4">
                    <PriorityBadge priority={c.priority} />
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-5 py-4 text-slate-500">
                    {formatDate(c.lastUpdated)}
                  </td>
                </tr>
              ))}
              {customerCases.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-slate-400"
                  >
                    No cases for this customer yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "communications" && (
        <div className="space-y-3">
          {customerComms.map((comm) => (
            <div
              key={comm.id}
              className="bg-white rounded-xl border border-slate-200 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-slate-800 text-sm">
                    {comm.subject}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {comm.type} · {comm.agent} · {formatDate(comm.date)}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded font-mono shrink-0">
                  {comm.caseId}
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-2.5 leading-relaxed">
                {comm.body}
              </p>
            </div>
          ))}
          {customerComms.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 px-6 py-10 text-center text-slate-400 text-sm">
              No communications yet.
            </div>
          )}
        </div>
      )}

      {tab === "notes" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          {customer.notes ? (
            <p className="text-sm text-slate-700 leading-relaxed">
              {customer.notes}
            </p>
          ) : (
            <p className="text-sm text-slate-400 italic">
              No notes for this customer.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
