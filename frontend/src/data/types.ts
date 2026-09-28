export type CaseStatus = "Open" | "In Progress" | "Pending" | "Resolved" | "Closed"
export type CasePriority = "Low" | "Medium" | "High" | "Urgent"
export type CustomerStatus = "Active" | "Inactive" | "Suspended"
export type CommType = "Email" | "Phone" | "Internal Note" | "Customer Message"

export interface Customer {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  city: string
  province: string
  postalCode: string
  country: string
  notes: string
  status: CustomerStatus
  createdDate: string
  casesCount: number
}

export interface Case {
  id: string
  customerId: string
  customerName: string
  subject: string
  category: string
  description: string
  assignedAgent: string
  priority: CasePriority
  status: CaseStatus
  createdDate: string
  lastUpdated: string
  resolvedAt?: string | null
}

export interface Communication {
  id: string
  customerId: string
  customerName: string
  caseId: string
  type: CommType
  subject: string
  body: string
  agent: string
  date: string
}

export interface CaseActivity {
  id: string
  type: "created" | "assigned" | "status_change" | "note" | "communication" | "resolved"
  text: string
  agent: string
  date: string
}
