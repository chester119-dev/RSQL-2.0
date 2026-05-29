const API_URL = "http://localhost:34872"

export type HealthResponse = {
  success: boolean
  service: string
  version?: string
  port: number
  sessions: number
  capabilities?: {
    sessionCommands?: boolean
    sessionResults?: boolean
  }
}

export type Session = {
  sessionId: string
  connected: boolean
  placeId: number | null
  gameName: string
  createdAt: number
  lastPing: number
}

export type ConsoleEntry = {
  level: "info" | "success" | "warning" | "error" | "result"
  message: string
}

export type StudioResult = {
  commandId: string
  success: boolean
  output: ConsoleEntry[]
  result: unknown
  message: string | null
  createdAt: number
}

export type SettingsPayload = {
  language: "en" | "es" | "pt"
  theme: "dark" | "light" | "midnight"
}

export type TokenResponse = {
  token: string
  expiresIn: number
}

async function request<T>(
  path: string,
  options?: RequestInit
) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  })

  const contentType = response.headers.get("content-type") ?? ""
  const data = contentType.includes("application/json")
    ? await response.json()
    : {
        success: false,
        message: await response.text()
      }

  if (!response.ok || data.success === false) {
    throw new Error(data.message || "Bridge request failed")
  }

  return data as T
}

export async function generateToken() {
  const data = await request<TokenResponse>("/token")

  return {
    token: data.token,
    expiresIn: data.expiresIn
  }
}

export async function getHealth() {
  return request<HealthResponse>("/health")
}

export async function getSettings() {
  const data = await request<{
    settings: SettingsPayload
  }>("/settings")

  return data.settings
}

export async function saveSettings(settings: SettingsPayload) {
  const data = await request<{
    settings: SettingsPayload
  }>("/settings", {
    method: "POST",
    body: JSON.stringify({
      settings
    })
  })

  return data.settings
}

export async function getSessions() {
  const data = await request<{
    sessions: Session[]
  }>("/sessions")

  return data.sessions
}

export async function executeRsql(
  code: string,
  sessionIds: string[]
) {
  return request<{
    output: ConsoleEntry[]
    result: unknown
  }>("/execute", {
    method: "POST",
    body: JSON.stringify({
      code,
      sessionIds
    })
  })
}

export async function getSessionResults(sessionId: string) {
  const data = await request<{
    results: StudioResult[]
  }>(`/sessions/${sessionId}/results`)

  return data.results
}

export async function disconnectSession(sessionId: string) {
  return request<{
    success: boolean
  }>("/disconnect", {
    method: "POST",
    body: JSON.stringify({
      sessionId
    })
  })
}
