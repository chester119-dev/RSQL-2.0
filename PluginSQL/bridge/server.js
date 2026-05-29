const express = require("express")
const cors = require("cors")
const crypto = require("crypto")
const fs = require("fs")
const os = require("os")
const path = require("path")

const app = express()

app.use(cors())
app.use(express.json())

const PORT = Number(process.env.PORT || 34872)

const tokens = new Map()
const sessions = new Map()

const TOKEN_EXPIRE_MS = 24 * 60 * 60 * 1000
const SESSION_TIMEOUT_MS = 30 * 1000
const DEBUG_DIR = process.env.RSQL_DEBUG_DIR || path.join(
  process.env.LOCALAPPDATA || path.join(os.homedir(), ".rsql"),
  "RSQL"
)
const DEBUG_LOG_PATH = process.env.RSQL_DEBUG_LOG || path.join(DEBUG_DIR, "rsql-api-debug.log")
const DEBUG_VERBOSE = process.env.RSQL_DEBUG_VERBOSE === "1"
const WEB_DIST_DIR = process.env.RSQL_WEB_DIST || path.join(__dirname, "..", "web-dist")
const SETTINGS_PATH = process.env.RSQL_SETTINGS_FILE || path.join(DEBUG_DIR, "settings.json")
const DEFAULT_SETTINGS = Object.freeze({
  language: "pt",
  theme: "dark"
})
const SUPPORTED_LANGUAGES = new Set(["en", "es", "pt"])
const SUPPORTED_THEMES = new Set(["dark", "light", "midnight"])

function hasWebDist() {
  return fs.existsSync(path.join(WEB_DIST_DIR, "index.html"))
}

function ensureDebugDir() {
  fs.mkdirSync(DEBUG_DIR, {
    recursive: true
  })
}

function redactValue(key, value) {
  if (/token/i.test(key)) {
    return value ? "[redacted]" : value
  }

  return value
}

function sanitizePayload(value, depth = 0, key = "") {
  if (depth > 5) {
    return "[max-depth]"
  }

  if (value === null || value === undefined) {
    return value
  }

  if (typeof value !== "object") {
    return redactValue(key, value)
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizePayload(item, depth + 1))
  }

  return Object.fromEntries(
    Object.entries(value).map(([entryKey, entryValue]) => [
      entryKey,
      sanitizePayload(redactValue(entryKey, entryValue), depth + 1, entryKey)
    ])
  )
}

function safeJson(value) {
  try {
    return JSON.stringify(sanitizePayload(value))
  } catch (error) {
    return JSON.stringify({
      error: "Could not serialize debug payload",
      message: String(error)
    })
  }
}

function debugEvent(event, payload = {}, options = {}) {
  if (options.verbose && !DEBUG_VERBOSE) {
    return
  }

  const line = [
    new Date().toISOString(),
    event,
    safeJson(payload)
  ].join(" ")

  try {
    ensureDebugDir()
    fs.appendFileSync(DEBUG_LOG_PATH, `${line}\n`, "utf8")
  } catch (error) {
    console.warn(`Could not write RSQL debug log: ${error.message}`)
  }
}

function normalizeSettingsPayload(value, base = DEFAULT_SETTINGS) {
  const source = value && typeof value === "object"
    ? value
    : {}

  return {
    language: SUPPORTED_LANGUAGES.has(source.language) ? source.language : base.language,
    theme: SUPPORTED_THEMES.has(source.theme) ? source.theme : base.theme
  }
}

function writeSettings(settings) {
  const normalizedSettings = normalizeSettingsPayload(settings)

  fs.mkdirSync(path.dirname(SETTINGS_PATH), {
    recursive: true
  })
  fs.writeFileSync(
    SETTINGS_PATH,
    `${JSON.stringify(normalizedSettings, null, 2)}\n`,
    "utf8"
  )

  return normalizedSettings
}

function readSettings() {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) {
      return writeSettings(DEFAULT_SETTINGS)
    }

    const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf8"))
    return normalizeSettingsPayload(settings)
  } catch (error) {
    debugEvent("SETTINGS_READ_FAILED", {
      settingsPath: SETTINGS_PATH,
      message: error.message
    })

    return writeSettings(DEFAULT_SETTINGS)
  }
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex")
}

function createSession() {
  return crypto.randomUUID()
}

function createCommandId() {
  return crypto.randomUUID()
}

function removeExpiredTokens() {
  const now = Date.now()

  for (const [token, data] of tokens) {
    if (now - data.createdAt > TOKEN_EXPIRE_MS) {
      tokens.delete(token)
    }
  }
}

function updateSessionStatus() {
  const now = Date.now()

  for (const session of sessions.values()) {
    session.connected = now - session.lastPing <= SESSION_TIMEOUT_MS
  }
}

setInterval(removeExpiredTokens, 60 * 1000)
setInterval(updateSessionStatus, 5 * 1000)

function getHealthPayload() {
  updateSessionStatus()

  return {
    success: true,
    service: "RSQL Bridge",
    version: "1.0.0",
    port: PORT,
    web: hasWebDist() ? "bundled" : "external",
    sessions: sessions.size,
    capabilities: {
      sessionCommands: true,
      sessionResults: true
    }
  }
}

if (hasWebDist()) {
  app.use(express.static(WEB_DIST_DIR, {
    index: false
  }))
}

app.get("/", (req, res) => {
  if (hasWebDist()) {
    res.sendFile(path.join(WEB_DIST_DIR, "index.html"))
    return
  }

  res.type("text").send([
    "RSQL Bridge is running.",
    "",
    "This is the local API used by the web app and Roblox Studio plugin.",
    "Open the web app on the Vite port, usually http://localhost:5173/, or build the web app into web-dist.",
    "Health check: http://localhost:34872/health"
  ].join("\n"))
})

app.get("/health", (req, res) => {
  res.json(getHealthPayload())
})

app.get("/settings", (req, res) => {
  try {
    res.json({
      success: true,
      settings: readSettings()
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Could not read settings: ${error.message}`
    })
  }
})

app.post("/settings", (req, res) => {
  try {
    const settings = writeSettings(req.body.settings || req.body)

    debugEvent("WEB_SETTINGS_SAVED", {
      settings
    })

    res.json({
      success: true,
      settings
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Could not save settings: ${error.message}`
    })
  }
})

app.get("/token", (req, res) => {
  const token = generateToken()

  tokens.set(token, {
    createdAt: Date.now()
  })

  debugEvent("WEB_TOKEN_GENERATED", {
    expiresIn: TOKEN_EXPIRE_MS
  })

  res.json({
    success: true,
    token,
    expiresIn: TOKEN_EXPIRE_MS
  })
})

app.post("/connect", (req, res) => {
  const { token, placeId, gameName } = req.body

  if (!token || !tokens.has(token)) {
    debugEvent("STUDIO_CONNECT_REJECTED", {
      placeId,
      gameName,
      reason: "Invalid or expired token"
    })

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    })
  }

  tokens.delete(token)

  const sessionId = createSession()

  sessions.set(sessionId, {
    sessionId,
    connected: true,
    placeId: placeId || null,
    gameName: gameName || "Unknown",
    createdAt: Date.now(),
    lastPing: Date.now(),
    commands: [],
    results: []
  })

  debugEvent("STUDIO_CONNECTED", {
    sessionId,
    placeId: placeId || null,
    gameName: gameName || "Unknown"
  })

  res.json({
    success: true,
    sessionId
  })
})

app.post("/ping", (req, res) => {
  const { sessionId } = req.body

  if (!sessionId || !sessions.has(sessionId)) {
    debugEvent("STUDIO_PING_REJECTED", {
      sessionId,
      reason: "Invalid session"
    })

    return res.status(401).json({
      success: false,
      message: "Invalid session"
    })
  }

  const session = sessions.get(sessionId)

  session.lastPing = Date.now()
  session.connected = true

  debugEvent("STUDIO_PING", {
    sessionId,
    gameName: session.gameName
  }, {
    verbose: true
  })

  res.json({
    success: true
  })
})

app.get("/sessions", (req, res) => {
  updateSessionStatus()

  const list = Array.from(sessions.values()).map((session) => ({
    sessionId: session.sessionId,
    connected: session.connected,
    placeId: session.placeId,
    gameName: session.gameName,
    createdAt: session.createdAt,
    lastPing: session.lastPing
  }))

  res.json({
    success: true,
    sessions: list
  })
})

app.post("/execute", (req, res) => {
  const { code, sessionId, sessionIds } = req.body

  if (!code || typeof code !== "string") {
    debugEvent("WEB_EXECUTE_REJECTED", {
      reason: "Code is required"
    })

    return res.status(400).json({
      success: false,
      message: "Code is required"
    })
  }

  const targetSessionIds = Array.isArray(sessionIds)
    ? sessionIds
    : sessionId
      ? [sessionId]
      : []

  if (targetSessionIds.length === 0) {
    debugEvent("WEB_EXECUTE_REJECTED", {
      reason: "No target session",
      code
    })

    return res.status(409).json({
      success: false,
      message: "Select at least one connected Roblox Studio place before executing RSQL"
    })
  }

  const invalidSessionId = targetSessionIds.find((targetSessionId) => !sessions.has(targetSessionId))

  if (invalidSessionId) {
    debugEvent("WEB_EXECUTE_REJECTED", {
      reason: "Invalid session",
      invalidSessionId,
      code
    })

    return res.status(401).json({
      success: false,
      message: `Invalid session: ${invalidSessionId}`
    })
  }

  const queued = targetSessionIds.map((targetSessionId) => {
    const session = sessions.get(targetSessionId)
    const commandId = createCommandId()

    session.commands.push({
      commandId,
      code,
      createdAt: Date.now()
    })

    return {
      commandId,
      sessionId: targetSessionId,
      gameName: session.gameName
    }
  })

  debugEvent("WEB_EXECUTE_QUEUED", {
    targetSessionIds,
    queued,
    code
  })

  res.json({
    success: true,
    commandId: queued[0].commandId,
    queued,
    output: [
      ...queued.map((item) => ({
        level: "info",
        message: `Queued command ${item.commandId} for ${item.gameName}`
      }))
    ],
    result: null
  })
})

app.get("/sessions/:sessionId/commands/next", (req, res) => {
  const { sessionId } = req.params
  const session = sessions.get(sessionId)

  if (!session) {
    debugEvent("STUDIO_COMMAND_POLL_REJECTED", {
      sessionId,
      reason: "Invalid session"
    })

    return res.status(401).json({
      success: false,
      message: "Invalid session"
    })
  }

  session.lastPing = Date.now()
  session.connected = true

  const command = session.commands.shift() || null

  if (command) {
    debugEvent("BRIDGE_COMMAND_DELIVERED", {
      sessionId,
      gameName: session.gameName,
      command
    })
  } else {
    debugEvent("STUDIO_COMMAND_POLL_EMPTY", {
      sessionId,
      gameName: session.gameName
    }, {
      verbose: true
    })
  }

  res.json({
    success: true,
    command
  })
})

app.post("/sessions/:sessionId/results", (req, res) => {
  const { sessionId } = req.params
  const { commandId, output, result, success, message } = req.body
  const session = sessions.get(sessionId)

  if (!session) {
    debugEvent("STUDIO_RESULT_REJECTED", {
      sessionId,
      commandId,
      reason: "Invalid session"
    })

    return res.status(401).json({
      success: false,
      message: "Invalid session"
    })
  }

  session.lastPing = Date.now()
  session.connected = true
  session.results.push({
    commandId,
    success: success !== false,
    output: Array.isArray(output) ? output : [],
    result: result ?? null,
    message: message || null,
    createdAt: Date.now()
  })

  debugEvent("STUDIO_RESULT_RECEIVED", {
    sessionId,
    gameName: session.gameName,
    commandId,
    success: success !== false,
    message: message || null,
    output: Array.isArray(output) ? output : [],
    result: result ?? null
  })

  res.json({
    success: true
  })
})

app.get("/sessions/:sessionId/results", (req, res) => {
  const { sessionId } = req.params
  const session = sessions.get(sessionId)

  if (!session) {
    debugEvent("WEB_RESULTS_REJECTED", {
      sessionId,
      reason: "Invalid session"
    })

    return res.status(401).json({
      success: false,
      message: "Invalid session"
    })
  }

  const results = session.results.splice(0)

  debugEvent("WEB_RESULTS_READ", {
    sessionId,
    gameName: session.gameName,
    count: results.length,
    results
  }, {
    verbose: results.length === 0
  })

  res.json({
    success: true,
    results
  })
})

app.post("/disconnect", (req, res) => {
  const { sessionId } = req.body

  if (sessionId) {
    const session = sessions.get(sessionId)

    sessions.delete(sessionId)

    debugEvent("SESSION_DISCONNECTED", {
      sessionId,
      gameName: session?.gameName || null
    })
  }

  res.json({
    success: true
  })
})

app.listen(PORT, () => {
  console.log(`RSQL Bridge running on http://localhost:${PORT}`)
  console.log(`RSQL debug log: ${DEBUG_LOG_PATH}`)
  console.log(`RSQL settings: ${SETTINGS_PATH}`)
  debugEvent("BRIDGE_STARTED", {
    port: PORT,
    debugLog: DEBUG_LOG_PATH,
    settingsPath: SETTINGS_PATH,
    verbose: DEBUG_VERBOSE
  })
})
