import { request, upload, errorMessage } from "../lib/api"
import Feedback from "../components/Feedback"
import { useState } from "react"
import { useWorkspace } from "../data/Workspace"
import type { CaseStatus } from "../data/types"
import { StatusBadge, PriorityBadge } from "../components/StatusBadge"

interface CaseDetailsProps {
  caseId: string
  onBack: () => void
  onEdit: () => void
}

interface ActivityStyle {
  icon: string
  bg: string
  color: string
}
const activityIcons: Record<string, ActivityStyle> =
  {
    created: {
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
      bg: "bg-blue-100",
      color: "text-blue-600",
    },
    assigned: {
      icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
      bg: "bg-violet-100",
      color: "text-violet-600",
    },
    status_change: {
      icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
      bg: "bg-amber-100",
      color: "text-amber-600",
    },
    note: {
      icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
      bg: "bg-slate-100",
      color: "text-slate-600",
    },
    communication: {
      icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z",
      bg: "bg-sky-100",
      color: "text-sky-600",
    },
    resolved: {
      icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
      bg: "bg-emerald-100",
      color: "text-emerald-600",
    },
  }

export default function CaseDetails({
  caseId,
  onBack,
  onEdit,
}: CaseDetailsProps) {
  const { readOnly, cases, caseActivities, attachments, refresh, formatDate } =
    useWorkspace()
  const c = cases.find((x) => x.id === caseId)
  const activities = caseActivities[caseId] ?? []
  const [updateText, setUpdateText] = useState("")
  const [updateStatus, setUpdateStatus] = useState<CaseStatus | "">("")
  const [submitted, setSubmitted] = useState(false)
  const localActivities = activities
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [file, setFile] = useState<File | null>(null)

  if (!c) return <div className="p-6 text-slate-500">Case not found.</div>

  async function changeStatus(status: CaseStatus) {
    setError("")
    setBusy(true)
    try {
      await request(`/cases/${caseId}`, "PATCH", { status })
      await refresh()
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  async function submitUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!updateText.trim() && !file) return
    setError("")
    setBusy(true)
    setSubmitted(false)
    try {
      if (updateText.trim()) {
        await request(`/cases/${caseId}/updates`, "POST", {
          text: updateText,
          status: updateStatus,
        })
        setUpdateText("")
        setUpdateStatus("")
      }
      if (file) {
        await upload(`/cases/${caseId}/attachments`, file)
        setFile(null)
      }
      await refresh()
      setSubmitted(true)
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-5 wrap-anywhere">
      <Feedback error={error} />
      {/* Breadcrumb + actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          aria-label="Back to cases"
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
        <span className="text-sm text-slate-400">Cases</span>
        <span className="text-slate-300">/</span>
        <span className="font-mono text-sm text-slate-600">{caseId}</span>
        <div className="ml-auto flex gap-2 flex-wrap">
          {!readOnly && (
            <button
              onClick={onEdit}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Edit Case
            </button>
          )}
          {!readOnly && (
            <button
              disabled={busy}
              onClick={() => changeStatus("Closed")}
              className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg transition-colors"
            >
              Close Case
            </button>
          )}
          {!readOnly && (
            <button
              disabled={busy}
              onClick={() => changeStatus("Open")}
              className="px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors"
            >
              Reopen Case
            </button>
          )}
        </div>
      </div>

      {/* Case header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-5">
          <div>
            <span className="font-mono text-xs text-slate-400">{c.id}</span>
            <h2 className="font-display font-700 text-xl text-slate-900 mt-1">
              {c.subject}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <PriorityBadge priority={c.priority} />
            <StatusBadge status={c.status} />
          </div>
        </div>
        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-x-6 gap-y-3 text-sm border-t border-slate-100 pt-4">
          {[
            ["Customer", c.customerName],
            ["Agent", c.assignedAgent],
            ["Category", c.category],
            ["Created", formatDate(c.createdDate)],
            ["Last Updated", formatDate(c.lastUpdated)],
            ["Priority", c.priority],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                {k}
              </p>
              <p className="text-slate-700 mt-0.5">{v}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Description + timeline */}
        <div className="lg:col-span-2 space-y-5">
          {/* Description */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-display font-600 text-slate-800 text-sm mb-3 pb-2 border-b border-slate-100">
              Case Description
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed">
              {c.description}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold mb-3">Attachments</h3>
            {attachments
              .filter((a) => a.caseId === caseId)
              .map((a) => readOnly ? (
                <span key={a.id} className="block text-sm text-slate-500 py-2">
                  {a.name} ({Math.ceil(a.size / 1024)} KB)
                </span>
              ) : (
                <a
                  key={a.id}
                  href={`/api/attachments/${a.id}`}
                  className="block text-sm text-blue-600 py-2"
                >
                  {a.name} ({Math.ceil(a.size / 1024)} KB)
                </a>
              ))}
            {!attachments.some((a) => a.caseId === caseId) && (
              <p className="text-sm text-slate-400">No attachments.</p>
            )}
          </div>
          {/* Timeline */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-display font-600 text-slate-800 text-sm mb-5">
              Activity Timeline
            </h3>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-100" />
              <div className="space-y-5">
                {localActivities.map((a) => {
                  const style = activityIcons[a.type] ?? activityIcons.note
                  return (
                    <div key={a.id} className="flex gap-4 relative">
                      <div
                        className={`w-8 h-8 rounded-full ${style.bg} flex items-center justify-center shrink-0 z-10`}
                      >
                        <svg
                          className={`w-4 h-4 ${style.color}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.75}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d={style.icon}
                          />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0 pb-1">
                        <p className="text-sm text-slate-700">{a.text}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {a.agent} · {formatDate(a.date)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Update form */}
        {!readOnly && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-display font-600 text-slate-800 text-sm mb-4">
                Add Progress Update
              </h3>
              {submitted && (
                <div className="mb-3 text-xs bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg border border-emerald-200">
                  Update posted.
                </div>
              )}
              <form onSubmit={submitUpdate} className="space-y-3">
                <textarea
                  aria-label="Progress update"
                  value={updateText}
                  onChange={(e) => setUpdateText(e.target.value)}
                  rows={4}
                  placeholder="Write a progress note, internal update, or response…"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
                />
                <div>
                  <label htmlFor="casedetails-field-1" className="block text-xs font-medium text-slate-600 mb-1">
                    Change Status (optional)
                  </label>
                  <select id="casedetails-field-1"
                    value={updateStatus}
                    onChange={(e) =>
                      setUpdateStatus(e.target.value as CaseStatus | "")
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="">No status change</option>
                    {["Open", "In Progress", "Pending", "Resolved", "Closed"].map(
                      (s) => (
                        <option key={s}>{s}</option>
                      ),
                    )}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer border border-dashed border-slate-200 rounded-lg px-3 py-2 hover:border-blue-300 transition-colors">
                  <svg
                    className="w-4 h-4 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.75}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                  </svg>
                  {file?.name ?? "Attach a file"}
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.zip"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                <button
                  disabled={busy}
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                >
                  Submit Update
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
