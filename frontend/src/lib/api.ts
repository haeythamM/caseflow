let csrf = ""
let sessionGeneration = 0
let sessionState: "active" | "logging-out" | "logged-out" = "active"

class CancelledSessionRequest extends Error {
  constructor() {
    super("")
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors: Record<string, string> = {},
  ) {
    super(message)
  }
}

export async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const logout = path === "/auth/logout" && method === "POST"
  const protectedRequest = !path.startsWith("/auth/")
  if ((protectedRequest || logout) && sessionState !== "active")
    throw new CancelledSessionRequest()
  if (logout) {
    sessionState = "logging-out"
    sessionGeneration++
  }
  const generation = sessionGeneration
  const assertCurrent = () => {
    if (generation !== sessionGeneration) throw new CancelledSessionRequest()
  }
  try {
    const data = await send<T>(path, method, body, assertCurrent)
    if (logout) {
      sessionGeneration++
      csrf = ""
      sessionState = "logged-out"
    } else if (path === "/auth/login" || path === "/auth/me") {
      sessionState = "active"
    }
    return data
  } catch (error) {
    if (logout) sessionState = "active"
    throw error
  }
}

async function send<T>(
  path: string,
  method: string,
  body: unknown,
  assertCurrent: () => void,
): Promise<T> {
  if (method !== "GET" && !csrf) {
    const token = await request<{ csrf: string }>("/auth/csrf")
    assertCurrent()
    csrf = token.csrf
  }
  const form = body instanceof FormData
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: "same-origin",
      headers: {
        ...(body && !form ? { "Content-Type": "application/json" } : {}),
        ...(method !== "GET" ? { "X-CSRF-Token": csrf } : {}),
      },
      body: body === undefined ? undefined : form ? body : JSON.stringify(body),
    })
  } catch {
    assertCurrent()
    throw new ApiError(
      "Cannot reach the server. Check your connection and try again.",
      0,
    )
  }
  const raw: unknown = await response.json().catch(() => null)
  const payload = raw !== null && typeof raw === "object" && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {}
  // Check before errors, events, or token writes: old responses must never
  // affect the login screen or a subsequent authenticated session.
  assertCurrent()
  if (!response.ok) {
    if (response.status === 419) csrf = ""
    if (
      response.status === 401 &&
      path !== "/auth/login" &&
      path !== "/auth/me"
    )
      window.dispatchEvent(new Event("session-expired"))
    throw new ApiError(
      typeof payload.message === "string" ? payload.message : "Server unavailable. Please try again.",
      response.status,
      payload.errors && typeof payload.errors === "object" && !Array.isArray(payload.errors)
        ? Object.fromEntries(Object.entries(payload.errors).filter(([, value]) => typeof value === "string"))
        : {},
    )
  }
  if (!("data" in payload))
    throw new ApiError("Invalid server response. Please try again.", 502)
  const data = payload.data
  if (data && typeof data === "object" && "csrf" in data && typeof data.csrf === "string")
    csrf = data.csrf
  return payload.data as T
}

export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong."

interface UploadedFile {
  id: string
  name: string
}
export async function upload(path: string, file: File) {
  const body = new FormData()
  body.append("file", file)
  return request<UploadedFile>(path, "POST", body)
}
