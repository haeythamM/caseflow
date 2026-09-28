import { request, ApiError, errorMessage } from "../lib/api"
import Feedback from "../components/Feedback"
import { useState } from "react"
import { useWorkspace } from "../data/Workspace"
import type { CustomerStatus } from "../data/types"

interface CustomerFormProps {
  customerId?: string | null
  onSave: () => void
  onCancel: () => void
}

export default function CustomerForm({
  customerId,
  onSave,
  onCancel,
}: CustomerFormProps) {
  const { customers, refresh } = useWorkspace()
  const existing = customerId
    ? customers.find((c) => c.id === customerId)
    : null
  const isEdit = !!existing

  const [form, setForm] = useState({
    firstName: existing?.firstName ?? "",
    lastName: existing?.lastName ?? "",
    email: existing?.email ?? "",
    phone: existing?.phone ?? "",
    address: existing?.address ?? "",
    city: existing?.city ?? "",
    province: existing?.province ?? "",
    postalCode: existing?.postalCode ?? "",
    country: existing?.country ?? "Canada",
    notes: existing?.notes ?? "",
    status: (existing?.status ?? "Active") as CustomerStatus,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  function validate() {
    const e: Record<string, string> = {}
    if (!form.firstName.trim()) e.firstName = "First name is required."
    if (!form.lastName.trim()) e.lastName = "Last name is required."
    if (!form.email.trim()) e.email = "Email is required."
    else if (!/\S+@\S+\.\S+/.test(form.email))
      e.email = "Enter a valid email address."
    if (!form.phone.trim()) e.phone = "Phone number is required."
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
      await request(
        customerId ? `/customers/${customerId}` : "/customers",
        customerId ? "PATCH" : "POST",
        form,
      )
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

  function field(
    key: keyof typeof form,
    label: string,
    type = "text",
    placeholder = "",
  ) {
    return (
      <div>
        <label htmlFor={`customer-${key}`} className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
        <input
          id={`customer-${key}`}
          aria-invalid={!!errors[key]}
          aria-describedby={errors[key] ? `customer-${key}-error` : undefined}
          type={type}
          value={form[key] as string}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          placeholder={placeholder}
          className={`w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-all
            ${
              errors[key]
                ? "border-red-400 focus:border-red-400 focus:ring-red-100"
                : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"
            }`}
        />
        {errors[key] && (
          <p id={`customer-${key}-error`} className="mt-1 text-xs text-red-600">{errors[key]}</p>
        )}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <button
          aria-label="Back to customers"
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
        <div>
          <h2 className="font-display font-600 text-slate-900">
            {isEdit ? "Edit Customer" : "Add Customer"}
          </h2>
          {isEdit && (
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {customerId}
            </p>
          )}
        </div>
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
          Customer saved successfully.
        </div>
      )}

      <Feedback error={error} />
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-display font-600 text-slate-800 text-sm mb-4 pb-3 border-b border-slate-100">
            Personal Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field("firstName", "First Name *", "text", "Jane")}
            {field("lastName", "Last Name *", "text", "Smith")}
            {field(
              "email",
              "Email Address *",
              "email",
              "customer@example.test",
            )}
            {field("phone", "Phone Number *", "tel", "+1 (604) 555-0100")}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-display font-600 text-slate-800 text-sm mb-4 pb-3 border-b border-slate-100">
            Address
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              {field("address", "Street Address", "text", "123 Main Street")}
            </div>
            {field("city", "City", "text", "Vancouver")}
            {field("province", "Province / State", "text", "BC")}
            {field("postalCode", "Postal Code", "text", "V6B 1A1")}
            <div>
              <label htmlFor="customerform-field-1" className="block text-sm font-medium text-slate-700 mb-1.5">
                Country
              </label>
              <select id="customerform-field-1"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white"
              >
                {[
                  "Canada",
                  "USA",
                  "United Kingdom",
                  "Australia",
                  "Germany",
                  "France",
                  "Sweden",
                  "Senegal",
                  "Other",
                ].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-display font-600 text-slate-800 text-sm mb-4 pb-3 border-b border-slate-100">
            Account Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="customerform-field-2" className="block text-sm font-medium text-slate-700 mb-1.5">
                Customer Status
              </label>
              <select id="customerform-field-2"
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as CustomerStatus })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white"
              >
                <option>Active</option>
                <option>Inactive</option>
                <option>Suspended</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="customerform-field-3" className="block text-sm font-medium text-slate-700 mb-1.5">
                Notes
              </label>
              <textarea id="customerform-field-3"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                placeholder="Internal notes about this customer…"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
              />
            </div>
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
                d="M5 13l4 4L19 7"
              />
            </svg>
            {isEdit ? "Save Changes" : "Save Customer"}
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
