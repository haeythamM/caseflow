import { useWorkspace } from "../data/Workspace"
import { request, upload, errorMessage } from "../lib/api"
import Feedback from "../components/Feedback"
import UserAvatar from "../components/UserAvatar"
import { useState } from "react"

export default function Settings() {
  const { user, refresh } = useWorkspace()
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [activeSection, setActiveSection] = useState("profile")
  const [profile, setProfile] = useState({
    name: user.name,
    email: user.email,
    role: user.role,
  })
  const [passwords, setPasswords] = useState({
    current: "",
    next: "",
    confirm: "",
  })
  const [notifications, setNotifications] = useState(
    user.settings.notifications ?? {
      caseAssigned: true,
      caseUpdated: true,
      caseResolved: false,
      digest: true,
    },
  )
  const [display, setDisplay] = useState(
    user.settings.display ?? {
      density: "comfortable",
      theme: "light",
      timezone: "America/Vancouver",
    },
  )
  const [saved, setSaved] = useState<string | null>(null)

  async function save(section: string) {
    setBusy(true)
    setError("")
    setSaved(null)
    const payload =
      section === "Profile"
        ? { profile }
        : section === "Password"
          ? { passwords }
          : section === "Notification"
            ? { notifications }
            : { display }
    try {
      await request("/settings", "PATCH", payload)
      await refresh()
      setSaved(section)
      if (section === "Password")
        setPasswords({ current: "", next: "", confirm: "" })
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  async function changePhoto(file?: File) {
    if (!file) return
    setBusy(true)
    setError("")
    try {
      await upload("/avatar", file)
      await refresh()
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const sections = [
    { id: "profile", label: "Profile" },
    { id: "account", label: "Account" },
    { id: "notifications", label: "Notifications" },
    { id: "display", label: "Display" },
  ]

  return (
    <div className="p-4 md:p-6 flex flex-col lg:flex-row gap-6">
      {/* Sidebar nav */}
      <div className="w-full lg:w-48 shrink-0">
        <nav className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-1 gap-0.5">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors font-medium
                ${
                  activeSection === s.id
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                }`}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 w-full max-w-2xl space-y-6">
        <Feedback error={error} />
        {saved && (
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 text-sm px-4 py-3 rounded-lg border border-emerald-200">
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
            {saved} settings saved successfully.
          </div>
        )}

        {activeSection === "profile" && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-display font-600 text-slate-800 mb-5 pb-3 border-b border-slate-100">
              Profile Information
            </h3>
            <div className="flex items-center gap-5 mb-6">
              <div className="w-16 h-16 shrink-0 rounded-full bg-blue-600 flex items-center justify-center text-white font-display font-700 text-xl">
                <UserAvatar
                  userId={user.id}
                  avatarId={user.avatarId}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover"
                  fallback={
                    user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-blue-600 cursor-pointer">
                  Change photo
                  <input
                    disabled={busy}
                    type="file"
                    accept="image/png,image/jpeg,image/gif"
                    className="hidden"
                    onChange={(e) => changePhoto(e.target.files?.[0])}
                  />
                </label>
                <p className="text-xs text-slate-400 mt-0.5">
                  JPG, PNG or GIF. Max 2MB.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { key: "name", label: "Full Name", type: "text" },
                { key: "email", label: "Email Address", type: "email" },
                { key: "role", label: "Role", type: "text" },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <label htmlFor={`profile-${key}`} className="block text-sm font-medium text-slate-700 mb-1.5">
                    {label}
                  </label>
                  <input
                    id={`profile-${key}`}
                    readOnly={key === "role"}
                    type={type}
                    value={profile[(key as keyof typeof profile)]}
                    onChange={(e) =>
                      setProfile({ ...profile, [key]: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              ))}
              <button
                disabled={busy}
                onClick={() => save("Profile")}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
              >
                Save Profile
              </button>
            </div>
          </div>
        )}

        {activeSection === "account" && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-display font-600 text-slate-800 mb-5 pb-3 border-b border-slate-100">
              Change Password
            </h3>
            <div className="space-y-4">
              {[
                { key: "current", label: "Current Password" },
                { key: "next", label: "New Password" },
                { key: "confirm", label: "Confirm New Password" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label htmlFor={`password-${key}`} className="block text-sm font-medium text-slate-700 mb-1.5">
                    {label}
                  </label>
                  <input
                    id={`password-${key}`}
                    autoComplete={key === "current" ? "current-password" : "new-password"}
                    type="password"
                    value={passwords[(key as keyof typeof passwords)]}
                    onChange={(e) =>
                      setPasswords({ ...passwords, [key]: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="••••••••"
                  />
                </div>
              ))}
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-700">
                Use a unique password of at least 12 characters (maximum 72
                bytes).
              </div>
              <button
                disabled={busy}
                onClick={() => save("Password")}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
              >
                Update Password
              </button>
            </div>
          </div>
        )}

        {activeSection === "notifications" && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-display font-600 text-slate-800 mb-5 pb-3 border-b border-slate-100">
              Notification Preferences
            </h3>
            <div className="space-y-4">
              {[
                {
                  key: "caseAssigned",
                  label: "Case assigned to me",
                  sub: "Notify when a new case is assigned to my queue",
                },
                {
                  key: "caseUpdated",
                  label: "Case updated",
                  sub: "Notify when a case I own is updated by a customer or colleague",
                },
                {
                  key: "caseResolved",
                  label: "Case resolved",
                  sub: "Notify when one of my cases is marked resolved",
                },
                {
                  key: "digest",
                  label: "Daily activity summary",
                  sub: "Include recent activity in the notification panel",
                },
              ].map(({ key, label, sub }) => (
                <div
                  key={key}
                  className="flex items-start justify-between gap-4 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {label}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-label={label}
                    aria-checked={notifications[key as keyof typeof notifications]}
                    onClick={() =>
                      setNotifications({
                        ...notifications,
                        [key]:
                          !notifications[(key as keyof typeof notifications)],
                      })
                    }
                    className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
                      notifications[(key as keyof typeof notifications)]
                        ? "bg-blue-600"
                        : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        notifications[(key as keyof typeof notifications)]
                          ? "translate-x-5"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              ))}
              <button
                disabled={busy}
                onClick={() => save("Notification")}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
              >
                Save Preferences
              </button>
            </div>
          </div>
        )}

        {activeSection === "display" && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-display font-600 text-slate-800 mb-5 pb-3 border-b border-slate-100">
              Display Preferences
            </h3>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Interface Density
                </label>
                <div className="flex flex-wrap gap-3">
                  {["compact", "comfortable", "spacious"].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDisplay({ ...display, density: d })}
                      className={`px-4 py-2 text-sm rounded-lg border capitalize transition-colors ${
                        display.density === d
                          ? "bg-blue-600 text-white border-blue-600"
                          : "border-slate-300 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="settings-field-1" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Time Zone
                </label>
                <select id="settings-field-1"
                  value={display.timezone}
                  onChange={(e) =>
                    setDisplay({ ...display, timezone: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-500 bg-white"
                >
                  {[
                    "America/Vancouver",
                    "America/Toronto",
                    "America/New_York",
                    "Europe/London",
                    "Europe/Stockholm",
                    "Asia/Tokyo",
                  ].map((tz) => (
                    <option key={tz}>{tz}</option>
                  ))}
                </select>
              </div>
              <button
                disabled={busy}
                onClick={() => save("Display")}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
              >
                Save Display Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
