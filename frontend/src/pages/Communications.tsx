import { request, errorMessage } from "../lib/api"
import Feedback from "../components/Feedback"
import { useState } from "react"
import { useWorkspace } from "../data/Workspace"
import type { CommType } from "../data/types"

const typeColors: Record<CommType, string> = {
  Email: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  Phone: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  "Internal Note": "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  "Customer Message":
    "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
}

const typeIcons: Record<CommType, string> = {
  Email:
    "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  Phone:
    "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z",
  "Internal Note":
    "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  "Customer Message":
    "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z",
}

export default function Communications() {
  const {
    readOnly,
    communications,
    cases,
    customers,
    refresh,
    formatDate,
  } = useWorkspace()

  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [compose, setCompose] = useState(false)

  const [form, setForm] = useState({
    caseId: "",
    type: "Internal Note",
    subject: "",
    body: "",
  })

  function customerName(customerId: string) {
    const customer = customers.find(
      (customer) => customer.id === customerId,
    )

    return customer
      ? `${customer.firstName} ${customer.lastName}`
      : "Unknown customer"
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()

    setError("")
    setBusy(true)

    try {
      await request("/communications", "POST", form)
      await refresh()

      setCompose(false)

      setForm({
        caseId: "",
        type: "Internal Note",
        subject: "",
        body: "",
      })
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const [selected, setSelected] = useState(communications[0])
  const [typeFilter, setTypeFilter] = useState("All")
  const [search, setSearch] = useState("")

  const filtered = communications.filter((communication) => {
    const q = search.toLowerCase()

    const matchSearch =
      !q ||
      `${customerName(communication.customerId)} ${
        communication.subject
      } ${communication.caseId} ${communication.agent}`
        .toLowerCase()
        .includes(q)

    const matchType =
      typeFilter === "All" ||
      communication.type === typeFilter

    return matchSearch && matchType
  })

  return (
    <div className="p-4 md:p-6 min-h-full lg:h-full w-full max-w-full min-w-0 flex flex-col gap-5">
      <Feedback error={error} />

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <p className="text-sm text-slate-500">
          Record customer conversations and internal notes.
        </p>

        {!readOnly && (
          <button
            type="button"
            onClick={() => setCompose(!compose)}
            className="rounded-lg bg-blue-600 text-white px-4 py-2"
          >
            Log communication
          </button>
        )}
      </div>

      {!readOnly && compose && (
        <form
          onSubmit={save}
          className="min-w-0 max-w-full bg-white border rounded-xl p-5 space-y-3"
        >
          <select
            aria-label="Case"
            required
            value={form.caseId}
            onChange={(e) =>
              setForm({
                ...form,
                caseId: e.target.value,
              })
            }
            className="border rounded p-2 w-full"
          >
            <option value="">Select case</option>

            {cases.map((caseItem) => (
              <option
                key={caseItem.id}
                value={caseItem.id}
              >
                {caseItem.id} — {caseItem.subject}
              </option>
            ))}
          </select>

          <select
            aria-label="Type"
            value={form.type}
            onChange={(e) =>
              setForm({
                ...form,
                type: e.target.value,
              })
            }
            className="border rounded p-2 w-full"
          >
            {Object.keys(typeColors).map((type) => (
              <option key={type}>
                {type}
              </option>
            ))}
          </select>

          <input
            aria-label="Subject"
            required
            placeholder="Subject"
            value={form.subject}
            onChange={(e) =>
              setForm({
                ...form,
                subject: e.target.value,
              })
            }
            className="border rounded p-2 w-full"
          />

          <textarea
            aria-label="Message"
            required
            placeholder="Conversation or note"
            value={form.body}
            onChange={(e) =>
              setForm({
                ...form,
                body: e.target.value,
              })
            }
            className="border rounded p-2 w-full"
          />

          <p className="text-xs text-slate-500">
            This records a conversation. Email delivery is not configured.
          </p>

          <button
            disabled={busy}
            className="rounded bg-blue-600 text-white px-4 py-2"
          >
            {busy ? "Saving…" : "Save communication"}
          </button>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 min-w-0">
        <div className="relative flex-1 min-w-0 w-full">
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
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            placeholder="Search communications…"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) =>
            setTypeFilter(e.target.value)
          }
          className="w-full sm:w-auto min-w-0 max-w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-blue-400 bg-white"
        >
          {[
            "All",
            "Email",
            "Phone",
            "Internal Note",
            "Customer Message",
          ].map((type) => (
            <option key={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {/* Split pane */}
      <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0 min-w-0 w-full">
        {/* List */}
        <div className="w-full lg:w-80 max-w-full min-w-0 shrink-0 bg-white rounded-xl border border-slate-200 lg:overflow-y-auto">
          {filtered.map((communication) => (
            <button
              key={communication.id}
              type="button"
              onClick={() =>
                setSelected(communication)
              }
              className={`w-full max-w-full min-w-0 text-left p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                selected?.id === communication.id
                  ? "bg-blue-50/60 border-l-2 border-l-blue-500"
                  : ""
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="flex-1 min-w-0 text-sm font-medium text-slate-800 truncate">
                  {communication.subject}
                </p>

                <span
                  className={`shrink-0 text-xs px-2 py-0.5 rounded font-medium ${
                    typeColors[communication.type]
                  }`}
                >
                  {communication.type}
                </span>
              </div>

              <p className="text-xs text-slate-500 mt-1 truncate">
                {customerName(
                  communication.customerId,
                )}{" "}
                · {communication.caseId}
              </p>

              <p className="text-xs text-slate-400 mt-0.5">
                {formatDate(
                  communication.date,
                )}
              </p>
            </button>
          ))}

          {filtered.length === 0 && (
            <p className="p-6 text-sm text-slate-400 text-center">
              No communications found.
            </p>
          )}
        </div>

        {/* Detail */}
        {selected ? (
          <div className="flex-1 min-w-0 w-full max-w-full [overflow-wrap:anywhere] bg-white rounded-xl border border-slate-200 p-4 md:p-6 lg:overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="min-w-0">
                <h3 className="font-display font-600 text-slate-900 text-lg">
                  {selected.subject}
                </h3>

                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium ${
                      typeColors[selected.type]
                    }`}
                  >
                    {selected.type}
                  </span>

                  <span className="text-xs text-slate-400">
                    Case:{" "}
                    <span className="font-mono">
                      {selected.caseId}
                    </span>
                  </span>

                  <span className="text-xs text-slate-400">
                    {formatDate(selected.date)}
                  </span>
                </div>
              </div>

              <div
                className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center ${
                  typeColors[selected.type]
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.75}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d={typeIcons[selected.type]}
                  />
                </svg>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm pb-5 mb-5 border-b border-slate-100">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                  Customer
                </p>

                <p className="text-slate-700 mt-0.5">
                  {customerName(
                    selected.customerId,
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                  Agent
                </p>

                <p className="text-slate-700 mt-0.5">
                  {selected.agent}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {selected.body}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-w-0 w-full max-w-full p-6 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-center text-slate-400 text-sm">
            Select a communication to view
          </div>
        )}
      </div>
    </div>
  )
}
