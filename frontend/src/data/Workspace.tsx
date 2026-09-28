import { createContext, useContext, useState, type ReactNode } from "react"
import type { Customer, Case, Communication, CaseActivity } from "./types"
import { formatDate } from "../lib/date"
import { isDemoViewer } from "../permissions"
import { request } from "../lib/api"

interface DisplaySettings {
  density: string
  theme: string
  timezone: string
}
export interface User {
  id: string
  name: string
  email: string
  role: string
  avatarId: string | null
  settings: {
    notifications?: {
      caseAssigned: boolean
      caseUpdated: boolean
      caseResolved: boolean
      digest: boolean
    }
    display?: DisplaySettings
  }
}
export interface Workspace {
  user: User
  customers: Customer[]
  cases: Case[]
  communications: Communication[]
  caseActivities: Record<string, CaseActivity[]>
  agents: string[]
  categories: string[]
  attachments: {
    id: string
    caseId: string
    name: string
    mime: string
    size: number
    date: string
  }[]
}
const Context = createContext<Workspace & {
  refresh: () => Promise<void>
} | null>(null)

export default function WorkspaceProvider({
  initial,
  children,
}: {
  initial: Workspace
  children: ReactNode
}) {
  const [data, setData] = useState(initial)
  async function refresh() {
    setData(await request<Workspace>("/workspace"))
  }
  return (
    <Context.Provider value={{ ...data, refresh }}>{children}</Context.Provider>
  )
}

export function useWorkspace() {
  const context = useContext(Context)
  if (!context) throw new Error("WorkspaceProvider is required.")
  return {
    ...context,
    readOnly: isDemoViewer(context.user.role),
    formatDate: (value: string) =>
      formatDate(
        value,
        context.user.settings.display?.timezone ?? "America/Vancouver",
      ),
  }
}
