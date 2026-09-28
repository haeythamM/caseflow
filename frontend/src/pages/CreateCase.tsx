import { request, ApiError, errorMessage, upload } from "../lib/api"
import Feedback from "../components/Feedback"
import { useState } from "react"
import { useWorkspace } from "../data/Workspace"
import type { CasePriority, CaseStatus } from "../data/types"

interface CreateCaseProps {
  caseId?: string
  customerId?: string
  onSave: () => void
  onCancel: () => void
}

export default function CreateCase({
  onSave,
  onCancel,
  caseId,
  customerId,
}: CreateCaseProps) {
  const { customers, agents, categories, cases, refresh } = useWorkspace()
  const existing = cases.find((c) => c.id === caseId)
  const [form, setForm] = useState({
    customerId: existing?.customerId ?? customerId ?? "",
    subject: existing?.subject ?? "",
    category: existing?.category ?? "General Inquiry",
    description: existing?.description ?? "",
    priority: existing?.priority ?? "Medium" as CasePriority,
    assignedAgent: existing?.assignedAgent ?? "",
    status: existing?.status ?? "Open" as CaseStatus,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const fileName = file?.name
  const [createdId, setCreatedId] = useState<string | null>(null)

  function validate() {
    const e: Record<string, string> = {}
    if (!form.customerId) e.customerId = "Select a customer."
    if (!form.subject.trim()) e.subject = "Case subject is required."
    if (!form.description.trim()) e.description = "Description is required."
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setErrors({})
    setBusy(true)
    setError("")
    try {
      const result = createdId
        ? { id: createdId }
        : await request<{ id: string }>(
            caseId ? `/cases/${caseId}` : "/cases",
            caseId ? "PATCH" : "POST",
            form,
          )
      setCreatedId(result.id)
      if (file) await upload(`/cases/${result.id}/attachments`, file)
      await refresh()
      setSaved(true)
      onSave()
    } catch (error) {
      setError(errorMessage(error))
      if (error instanceof ApiError) setErrors(error.errors)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <button
          aria-label="Back to cases"
          onClick={onCancel}
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
        <h2 className="font-display font-600 text-slate-900">
          {caseId ? "Edit Case" : "Create New Case"}
        </h2>
      </div>

      {saved && (
        <div className="mb-5 flex items-center gap-2 bg-emerald-50 text-emerald-700 text-sm px-4 py-3 rounded-lg border border-emerald-200">
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
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Case created successfully.
        </div>
      )}

      <Feedback error={error} />
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h3 className="font-display font-600 text-slate-800 text-sm pb-3 border-b border-slate-100">
            Case Information
          </h3>

          <div>
            <label htmlFor="createcase-field-1" className="block text-sm font-medium text-slate-700 mb-1.5">
              Customer *
            </label>
            <select id="createcase-field-1"
              disabled={!!caseId || !!createdId}
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              className={`w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 bg-white transition-all ${
                errors.customerId
                  ? "border-red-400 focus:ring-red-100"
                  : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"
              }`}
            >
              <option value="">Select a customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName} ({c.id})
                </option>
              ))}
            </select>
            {errors.customerId && (
              <p className="mt-1 text-xs text-red-600">{errors.customerId}</p>
            )}
          </div>

          <div>
            <label htmlFor="createcase-field-2" className="block text-sm font-medium text-slate-700 mb-1.5">
              Case Subject *
            </label>
            <input id="createcase-field-2"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Brief description of the issue"
              className={`w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-all ${
                errors.subject
                  ? "border-red-400 focus:ring-red-100"
                  : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"
              }`}
            />
            {errors.subject && (
              <p className="mt-1 text-xs text-red-600">{errors.subject}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="createcase-field-3" className="block text-sm font-medium text-slate-700 mb-1.5">
                Category
              </label>
              <select id="createcase-field-3"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white"
              >
                <option value="">Select category…</option>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="createcase-field-4" className="block text-sm font-medium text-slate-700 mb-1.5">
                Priority
              </label>
              <select id="createcase-field-4"
                value={form.priority}
                onChange={(e) =>
                  setForm({ ...form, priority: e.target.value as CasePriority })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white"
              >
                {["Low", "Medium", "High", "Urgent"].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="createcase-field-5" className="block text-sm font-medium text-slate-700 mb-1.5">
                Assigned Agent
              </label>
              <select id="createcase-field-5"
                value={form.assignedAgent}
                onChange={(e) =>
                  setForm({ ...form, assignedAgent: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white"
              >
                <option value="">Unassigned</option>
                {agents.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="createcase-field-6" className="block text-sm font-medium text-slate-700 mb-1.5">
                Status
              </label>
              <select id="createcase-field-6"
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as CaseStatus })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white"
              >
                {["Open", "In Progress", "Pending", "Resolved", "Closed"].map(
                  (s) => (
                    <option key={s}>{s}</option>
                  ),
                )}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="createcase-field-7" className="block text-sm font-medium text-slate-700 mb-1.5">
              Description *
            </label>
            <textarea id="createcase-field-7"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={5}
              placeholder="Describe the issue in detail. Include steps to reproduce, error messages, and any relevant context…"
              className={`w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 resize-none transition-all ${
                errors.description
                  ? "border-red-400 focus:ring-red-100"
                  : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"
              }`}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-600">{errors.description}</p>
            )}
          </div>

          {/* Attachment */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Attachment
            </label>
            <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all text-center">
              <svg
                className="w-8 h-8 text-slate-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                />
              </svg>
              {fileName ? (
                <span className="text-sm text-blue-600 font-medium">
                  {fileName}
                </span>
              ) : (
                <>
                  <span className="text-sm text-slate-500">
                    Click to choose a file
                  </span>
                  <span className="text-xs text-slate-400">
                    PDF, PNG, JPG, ZIP up to 10MB
                  </span>
                </>
              )}
              <input
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.zip"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>

        <div className="flex gap-3 pb-2">
          <button
            disabled={busy}
            type="submit"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors"
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            {busy
              ? "Saving…"
              : createdId
                ? "Retry attachment / finish"
                : caseId
                  ? "Save Case"
                  : "Create Case"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
