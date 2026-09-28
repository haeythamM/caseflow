import { useEffect, useMemo, useState } from "react"
import { request, errorMessage } from "../lib/api"
import Feedback from "../components/Feedback"
import UserAvatar from "../components/UserAvatar"

interface UserRow {
  id: string
  name: string
  email: string
  role: string
  avatarId: string | null
  createdAt: string
}

export default function Users() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("All")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const perPage = 5

  useEffect(() => {
    async function loadUsers() {
      setLoading(true)
      setError("")

      try {
        const data = await request<UserRow[]>("/users")
        setUsers(data)
      } catch (error) {
        setError(errorMessage(error))
      } finally {
        setLoading(false)
      }
    }

    loadUsers()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()

    return users
      .filter((user) => {
        const matchSearch =
          !q ||
          `${user.id} ${user.name} ${user.email} ${user.role}`
            .toLowerCase()
            .includes(q)

        const matchRole =
          roleFilter === "All" ||
          user.role === roleFilter

        return matchSearch && matchRole
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [users, search, roleFilter])

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / perPage),
  )

  const paginated = filtered.slice(
    (page - 1) * perPage,
    page * perPage,
  )

  function initials(name: string) {
    return name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
  }

  function roleClasses(role: string) {
    if (role === "Admin") {
      return "bg-purple-50 text-purple-700 border-purple-200"
    }

    return "bg-blue-50 text-blue-700 border-blue-200"
  }

  return (
    <div className="p-6 space-y-5">
      <Feedback error={error} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-500">
            {filtered.length} users found
          </p>
        </div>
      </div>

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
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            placeholder="Search users..."
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value)
            setPage(1)
          }}
          className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-blue-400 bg-white"
        >
          <option>All</option>
          <option>Admin</option>
          <option>Support Agent</option>
          <option>Demo Viewer</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                {[
                  "User",
                  "Email",
                  "Role",
                  "User ID",
                  "Created",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 whitespace-nowrap"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-slate-400 text-sm"
                  >
                    Loading users...
                  </td>
                </tr>
              )}

              {!loading &&
                paginated.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-medium overflow-hidden shrink-0">
                          <UserAvatar
                            userId={user.id}
                            avatarId={user.avatarId}
                            alt={user.name}
                            className="w-full h-full object-cover"
                            fallback={initials(user.name)}
                          />
                        </div>

                        <span className="font-medium text-slate-800">
                          {user.name}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {user.email}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium ${roleClasses(user.role)}`}
                      >
                        {user.role}
                      </span>
                    </td>

                    <td className="px-5 py-4 font-mono text-xs text-slate-500">
                      {user.id}
                    </td>

                    <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                      {user.createdAt}
                    </td>
                  </tr>
                ))}

              {!loading && paginated.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-slate-400 text-sm"
                  >
                    No users found matching your search.
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
                onClick={() => setPage((current) => current - 1)}
                className="px-3 py-1.5 text-xs rounded border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>

              {Array.from(
                { length: totalPages },
                (_, index) => (
                  <button
                    key={index}
                    onClick={() => setPage(index + 1)}
                    className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                      page === index + 1
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {index + 1}
                  </button>
                ),
              )}

              <button
                disabled={page === totalPages}
                onClick={() => setPage((current) => current + 1)}
                className="px-3 py-1.5 text-xs rounded border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
