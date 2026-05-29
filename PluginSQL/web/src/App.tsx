import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ChangeEvent } from "react"
import rsqlLogoUrl from "../imagens/RSQL_Logo.png"
import CodeEditor from "./components/CodeEditor"
import {
  disconnectSession,
  executeRsql,
  generateToken,
  getHealth,
  getSettings,
  getSessionResults,
  getSessions,
  saveSettings
} from "./services/api"
import type {
  ConsoleEntry,
  Session,
  SettingsPayload
} from "./services/api"

const starterCode = `SELECTUSERID 123456789

-- IMPORT SharedRsqlLibrary
-- IMPORT URL("https://example.com/library.rsql")

VAR minimumCoins:Int = 100
VAR bonus:Int = 500
VAR isTester:Bool = true

FUNCTION AddCoins amount
SET PlayerData.Coins += $amount
SET PlayerData.IsTester = $isTester
PRINT
END

SELECT * FROM PlayerData
WHERE Coins >= $minimumCoins
PRINT

CALL AddCoins $bonus`

const legacyStarterCode = `SELECTUSERID 123456789

GET PlayerData
PRINT

SET PlayerData.Coins += 500
PRINT`

const whereStarterCode = `SELECTUSERID 123456789

GET PlayerData
WHERE Coins >= 100
PRINT

SET PlayerData.Coins += 500
PRINT`

const functionStarterCode = `SELECTUSERID 123456789

FUNCTION AddCoins amount
SET PlayerData.Coins += $amount
PRINT
END

GET PlayerData
WHERE Coins >= 100
PRINT

CALL AddCoins 500`

type Tab = "editor" | "console" | "datastore" | "sessions" | "tokens" | "settings"
type BridgeStatus = "offline" | "outdated" | "ready"
type LanguageCode = SettingsPayload["language"]
type ThemeCode = SettingsPayload["theme"]
type AppSettings = SettingsPayload
type TokenInfo = {
  value: string
  createdAt: number
  expiresAt: number
}
type ScriptDocument = {
  id: string
  name: string
  code: string
}

const scriptsStorageKey = "rsql:scripts:v1"
const settingsStorageKey = "rsql:settings:v1"
const defaultSettings: AppSettings = {
  language: "pt",
  theme: "dark"
}

const translations = {
  en: {
    editor: "Editor",
    console: "Console",
    datastore: "DataStore",
    sessions: "Sessions",
    tokens: "Tokens",
    settings: "Settings",
    appSubtitle: "Roblox Data Runtime",
    runtimeConsole: "Runtime Console",
    initialConsole: "Connect Roblox Studio to execute RSQL against live DataStores",
    clear: "Clear",
    dataStoreAccess: "DataStore Access",
    liveStudioDataStores: "Live Studio DataStores",
    dataStoreIntro: "RSQL reads and writes through the connected Roblox Studio plugin. Use SELECTUSERID to choose a player, VAR to create typed values, then run SELECT, FROM, WHERE, SET, DELETE, and PRINT against that player's DataStore records.",
    getPlayerData: "Get PlayerData",
    addCoins: "Add Coins",
    noStudioSessions: "No Studio sessions connected",
    refresh: "Refresh",
    noPlaceId: "No place id",
    connected: "Connected",
    idle: "Idle",
    select: "Select",
    disconnect: "Disconnect",
    create: "Create",
    save: "Save",
    rename: "Rename",
    open: "Open",
    delete: "Delete",
    bridgeOnline: "Bridge Online",
    bridgeOutdated: "Bridge Outdated",
    disconnected: "Disconnected",
    restartBridge: "Restart bridge",
    noStudioConnected: "No Studio connected",
    studioRequired: "Studio required",
    allPlaces: "All Places",
    allPlacesSingle: "all places (1)",
    allPlacesMany: "all places ({count})",
    selectedPlace: "selected place",
    selectConnectedPlace: "Select at least one connected place before executing RSQL",
    executedOn: "Executed {time} on {target}",
    executionFailed: "Execution failed",
    generateToken: "Generate Token",
    running: "Running",
    execute: "Execute",
    cannotGenerateToken: "Could not reach the bridge to generate a token",
    studioSessionDisconnected: "Studio session disconnected",
    cannotDisconnectSession: "Could not disconnect session",
    renamePrompt: "Rename script",
    tokenGenerated: "Token Generated",
    tokensTitle: "Connection Tokens",
    tokensHint: "Use the latest token to connect Roblox Studio to this bridge. Tokens are temporary and stop working after they expire.",
    noTokenTitle: "No token generated yet",
    noTokenDescription: "Generate a token to connect Roblox Studio. The token will appear here with its expiration time.",
    tokenValue: "Token",
    copyToken: "Copy Token",
    copied: "Copied",
    expiresIn: "Expires in",
    validUntil: "Valid until",
    expired: "Expired",
    copy: "Copy",
    cannotSaveSettings: "Could not save settings to the bridge JSON file",
    settingsTitle: "Web Settings",
    languageTitle: "Language",
    languageHint: "Choose the interface language used by the web panel.",
    themeTitle: "Theme",
    themeHint: "Choose the visual theme for the app and RSQL editor.",
    english: "English",
    spanish: "Spanish",
    portuguese: "Portuguese",
    themeDark: "Dark",
    themeDarkHint: "Balanced dark studio",
    themeLight: "Light",
    themeLightHint: "Clean daylight",
    themeMidnight: "Midnight",
    themeMidnightHint: "High contrast night"
  },
  es: {
    editor: "Editor",
    console: "Consola",
    datastore: "DataStore",
    sessions: "Sesiones",
    tokens: "Tokens",
    settings: "Configuracion",
    appSubtitle: "Roblox Data Runtime",
    runtimeConsole: "Consola del Runtime",
    initialConsole: "Conecta Roblox Studio para ejecutar RSQL en DataStores reales",
    clear: "Limpiar",
    dataStoreAccess: "Acceso a DataStore",
    liveStudioDataStores: "DataStores en vivo de Studio",
    dataStoreIntro: "RSQL lee y escribe a traves del plugin conectado en Roblox Studio. Usa SELECTUSERID para elegir un jugador, VAR para crear valores tipados, y luego ejecuta SELECT, FROM, WHERE, SET, DELETE y PRINT en los registros DataStore de ese jugador.",
    getPlayerData: "Obtener PlayerData",
    addCoins: "Agregar Coins",
    noStudioSessions: "No hay sesiones de Studio conectadas",
    refresh: "Actualizar",
    noPlaceId: "Sin place id",
    connected: "Conectado",
    idle: "Inactivo",
    select: "Seleccionar",
    disconnect: "Desconectar",
    create: "Crear",
    save: "Guardar",
    rename: "Renombrar",
    open: "Abrir",
    delete: "Eliminar",
    bridgeOnline: "Bridge Online",
    bridgeOutdated: "Bridge desactualizado",
    disconnected: "Desconectado",
    restartBridge: "Reinicia el bridge",
    noStudioConnected: "Ningun Studio conectado",
    studioRequired: "Studio requerido",
    allPlaces: "Todas las places",
    allPlacesSingle: "todas las places (1)",
    allPlacesMany: "todas las places ({count})",
    selectedPlace: "place seleccionada",
    selectConnectedPlace: "Selecciona al menos una place conectada antes de ejecutar RSQL",
    executedOn: "Ejecutado {time} en {target}",
    executionFailed: "La ejecucion fallo",
    generateToken: "Generar token",
    running: "Ejecutando",
    execute: "Ejecutar",
    cannotGenerateToken: "No se pudo alcanzar el bridge para generar un token",
    studioSessionDisconnected: "Sesion de Studio desconectada",
    cannotDisconnectSession: "No se pudo desconectar la sesion",
    renamePrompt: "Renombrar script",
    tokenGenerated: "Token generado",
    tokensTitle: "Tokens de conexion",
    tokensHint: "Usa el token mas reciente para conectar Roblox Studio a este bridge. Los tokens son temporales y dejan de funcionar cuando expiran.",
    noTokenTitle: "Aun no se genero ningun token",
    noTokenDescription: "Genera un token para conectar Roblox Studio. El token aparecera aqui con su tiempo de expiracion.",
    tokenValue: "Token",
    copyToken: "Copiar token",
    copied: "Copiado",
    expiresIn: "Expira en",
    validUntil: "Valido hasta",
    expired: "Expirado",
    copy: "Copiar",
    cannotSaveSettings: "No se pudo guardar la configuracion en el archivo JSON del bridge",
    settingsTitle: "Configuracion web",
    languageTitle: "Idioma",
    languageHint: "Elige el idioma de la interfaz del panel web.",
    themeTitle: "Tema",
    themeHint: "Elige el tema visual de la app y del editor RSQL.",
    english: "Ingles",
    spanish: "Espanol",
    portuguese: "Portugues",
    themeDark: "Oscuro",
    themeDarkHint: "Studio oscuro equilibrado",
    themeLight: "Claro",
    themeLightHint: "Luz limpia",
    themeMidnight: "Medianoche",
    themeMidnightHint: "Noche de alto contraste"
  },
  pt: {
    editor: "Editor",
    console: "Console",
    datastore: "DataStore",
    sessions: "Sessoes",
    tokens: "Tokens",
    settings: "Configuracoes",
    appSubtitle: "Roblox Data Runtime",
    runtimeConsole: "Console do Runtime",
    initialConsole: "Conecte o Roblox Studio para executar RSQL em DataStores reais",
    clear: "Limpar",
    dataStoreAccess: "Acesso ao DataStore",
    liveStudioDataStores: "DataStores ao vivo do Studio",
    dataStoreIntro: "O RSQL le e escreve atraves do plugin conectado no Roblox Studio. Use SELECTUSERID para escolher um jogador, VAR para criar valores tipados, e depois rode SELECT, FROM, WHERE, SET, DELETE e PRINT nos registros DataStore desse jogador.",
    getPlayerData: "Pegar PlayerData",
    addCoins: "Adicionar Coins",
    noStudioSessions: "Nenhuma sessao do Studio conectada",
    refresh: "Atualizar",
    noPlaceId: "Sem place id",
    connected: "Conectado",
    idle: "Inativo",
    select: "Selecionar",
    disconnect: "Desconectar",
    create: "Criar",
    save: "Salvar",
    rename: "Renomear",
    open: "Abrir",
    delete: "Excluir",
    bridgeOnline: "Bridge Online",
    bridgeOutdated: "Bridge desatualizado",
    disconnected: "Desconectado",
    restartBridge: "Reinicie o bridge",
    noStudioConnected: "Nenhum Studio conectado",
    studioRequired: "Studio necessario",
    allPlaces: "Todas as places",
    allPlacesSingle: "todas as places (1)",
    allPlacesMany: "todas as places ({count})",
    selectedPlace: "place selecionada",
    selectConnectedPlace: "Selecione pelo menos uma place conectada antes de executar RSQL",
    executedOn: "Executado {time} em {target}",
    executionFailed: "A execucao falhou",
    generateToken: "Gerar token",
    running: "Executando",
    execute: "Executar",
    cannotGenerateToken: "Nao foi possivel acessar o bridge para gerar um token",
    studioSessionDisconnected: "Sessao do Studio desconectada",
    cannotDisconnectSession: "Nao foi possivel desconectar a sessao",
    renamePrompt: "Renomear script",
    tokenGenerated: "Token gerado",
    tokensTitle: "Tokens de conexao",
    tokensHint: "Use o token mais recente para conectar o Roblox Studio a este bridge. Tokens sao temporarios e param de funcionar depois que expiram.",
    noTokenTitle: "Nenhum token gerado ainda",
    noTokenDescription: "Gere um token para conectar o Roblox Studio. O token vai aparecer aqui com o tempo de validade.",
    tokenValue: "Token",
    copyToken: "Copiar token",
    copied: "Copiado",
    expiresIn: "Expira em",
    validUntil: "Valido ate",
    expired: "Expirado",
    copy: "Copiar",
    cannotSaveSettings: "Nao foi possivel salvar as configuracoes no JSON do bridge",
    settingsTitle: "Configuracoes da web",
    languageTitle: "Idioma",
    languageHint: "Escolha o idioma usado na interface do painel web.",
    themeTitle: "Tema",
    themeHint: "Escolha o tema visual da app e do editor RSQL.",
    english: "Ingles",
    spanish: "Espanhol",
    portuguese: "Portugues",
    themeDark: "Escuro",
    themeDarkHint: "Studio escuro equilibrado",
    themeLight: "Claro",
    themeLightHint: "Luz limpa",
    themeMidnight: "Meia-noite",
    themeMidnightHint: "Noite de alto contraste"
  }
} satisfies Record<LanguageCode, Record<string, string>>

type TranslationKey = keyof typeof translations.en

const languageOptions: Array<{
  code: LanguageCode
  labelKey: TranslationKey
  nativeLabel: string
}> = [
  { code: "pt", labelKey: "portuguese", nativeLabel: "Portugues" },
  { code: "en", labelKey: "english", nativeLabel: "English" },
  { code: "es", labelKey: "spanish", nativeLabel: "Espanol" }
]

const themeOptions: Array<{
  code: ThemeCode
  labelKey: TranslationKey
  hintKey: TranslationKey
}> = [
  { code: "dark", labelKey: "themeDark", hintKey: "themeDarkHint" },
  { code: "light", labelKey: "themeLight", hintKey: "themeLightHint" },
  { code: "midnight", labelKey: "themeMidnight", hintKey: "themeMidnightHint" }
]

function createInitialConsole(message: string): ConsoleEntry[] {
  return [
    {
      level: "info",
      message
    }
  ]
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())
  const text = translations[settings.language]
  const [activeTab, setActiveTab] = useState<Tab>("editor")
  const [scripts, setScripts] = useState<ScriptDocument[]>(() => loadScripts())
  const [activeScriptId, setActiveScriptId] = useState("")
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)
  const [tokenCopied, setTokenCopied] = useState(false)
  const [showTokenToast, setShowTokenToast] = useState(false)
  const [closingTokenToast, setClosingTokenToast] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>("offline")
  const [sessions, setSessions] = useState<Session[]>([])
  const [consoleLines, setConsoleLines] = useState<ConsoleEntry[]>(
    () => createInitialConsole(text.initialConsole)
  )
  const [isExecuting, setIsExecuting] = useState(false)
  const [disconnectingSessionId, setDisconnectingSessionId] = useState("")
  const [selectedTarget, setSelectedTarget] = useState("all")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const tokenToastTimeoutRef = useRef<number | null>(null)

  const activeScript = useMemo(
    () => scripts.find((script) => script.id === activeScriptId) ?? scripts[0],
    [activeScriptId, scripts]
  )

  const code = activeScript?.code ?? ""

  const connectedSessions = useMemo(
    () => sessions.filter((session) => session.connected),
    [sessions]
  )

  const selectedSession = useMemo(
    () => sessions.find((session) => session.sessionId === selectedTarget),
    [selectedTarget, sessions]
  )

  const targetSessionIds = useMemo(() => {
    if (selectedTarget === "all") {
      return connectedSessions.map((session) => session.sessionId)
    }

    const session = connectedSessions.find((item) => item.sessionId === selectedTarget)

    return session ? [session.sessionId] : []
  }, [connectedSessions, selectedTarget])

  const refreshRuntime = useCallback(async () => {
    try {
      const health = await getHealth()

      if (!health.capabilities?.sessionCommands || !health.capabilities?.sessionResults) {
        setBridgeStatus("outdated")
        setSessions([])
        return
      }

      const nextSessions = await getSessions()

      setBridgeStatus("ready")
      setSessions(nextSessions)

      const liveSessions = nextSessions.filter((session) => session.connected)

      if (
        selectedTarget !== "all" &&
        !liveSessions.some((session) => session.sessionId === selectedTarget)
      ) {
        setSelectedTarget("all")
      }

      if (liveSessions.length > 0 && health.capabilities?.sessionResults) {
        const resultGroups = await Promise.all(
          liveSessions.map(async (session) => ({
            session,
            results: await getSessionResults(session.sessionId)
          }))
        )
        const consoleResults = resultGroups.flatMap(({ session, results }) => (
          results.flatMap((result) => [
            {
              level: result.success ? "success" : "error",
              message: result.success
                ? `${session.gameName} completed ${result.commandId}`
                : result.message || `${session.gameName} failed ${result.commandId}`
            } as ConsoleEntry,
            ...result.output
          ])
        ))

        if (consoleResults.length > 0) {
          setConsoleLines((current) => [
            ...current,
            ...consoleResults
          ])
        }
      }
    } catch {
      setBridgeStatus("offline")
      setSessions([])
    }
  }, [selectedTarget])

  useEffect(() => {
    refreshRuntime()

    const refreshId = window.setInterval(refreshRuntime, 4000)

    return () => window.clearInterval(refreshId)
  }, [refreshRuntime])

  useEffect(() => {
    let cancelled = false

    getSettings()
      .then((bridgeSettings) => {
        if (!cancelled) {
          setSettings(normalizeSettings(bridgeSettings))
        }
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(settingsStorageKey, JSON.stringify(settings))
    document.documentElement.dataset.theme = settings.theme
    document.documentElement.lang = settings.language
  }, [settings])

  useEffect(() => {
    localStorage.setItem(scriptsStorageKey, JSON.stringify(scripts))
  }, [scripts])

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000)

    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    if (!tokenCopied) return

    const timeoutId = window.setTimeout(() => setTokenCopied(false), 1800)

    return () => window.clearTimeout(timeoutId)
  }, [tokenCopied])

  useEffect(() => () => {
    if (tokenToastTimeoutRef.current !== null) {
      window.clearTimeout(tokenToastTimeoutRef.current)
    }
  }, [])

  async function handleExecute() {
    if (targetSessionIds.length === 0) {
      setConsoleLines((current) => [
        ...current,
        {
          level: "error",
          message: text.selectConnectedPlace
        }
      ])
      setActiveTab("console")
      return
    }

    setIsExecuting(true)

    try {
      const execution = await executeRsql(activeScript?.code ?? "", targetSessionIds)

      setConsoleLines((current) => [
        ...current,
        {
          level: "info",
          message: text.executedOn
            .replace("{time}", new Date().toLocaleTimeString())
            .replace("{target}", getTargetLabel())
        },
        ...execution.output
      ])

      setActiveTab("console")
      await refreshRuntime()
    } catch (error) {
      setConsoleLines((current) => [
        ...current,
        {
          level: "error",
          message: error instanceof Error
            ? error.message
            : text.executionFailed
        }
      ])
      setActiveTab("console")
    } finally {
      setIsExecuting(false)
    }
  }

  async function handleGenerateToken() {
    try {
      const tokenResponse = await generateToken()
      const createdAt = Date.now()
      const expiresIn = tokenResponse.expiresIn || 24 * 60 * 60 * 1000

      setTokenInfo({
        value: tokenResponse.token,
        createdAt,
        expiresAt: createdAt + expiresIn
      })
      setTokenCopied(false)
      openTokenToast()
    } catch {
      setConsoleLines((current) => [
        ...current,
        {
          level: "error",
          message: text.cannotGenerateToken
        }
      ])
      setActiveTab("console")
    }
  }

  async function handleDisconnect(sessionId: string) {
    setDisconnectingSessionId(sessionId)

    try {
      await disconnectSession(sessionId)
      setSessions((current) => current.filter((session) => session.sessionId !== sessionId))
      if (selectedTarget === sessionId) {
        setSelectedTarget("all")
      }
      setConsoleLines((current) => [
        ...current,
        {
          level: "info",
          message: text.studioSessionDisconnected
        }
      ])
      await refreshRuntime()
    } catch (error) {
      setConsoleLines((current) => [
        ...current,
        {
          level: "error",
          message: error instanceof Error
            ? error.message
            : text.cannotDisconnectSession
        }
      ])
      setActiveTab("console")
    } finally {
      setDisconnectingSessionId("")
    }
  }

  function getTargetLabel() {
    if (selectedTarget === "all") {
      return connectedSessions.length === 1
        ? text.allPlacesSingle
        : text.allPlacesMany.replace("{count}", connectedSessions.length.toString())
    }

    return selectedSession?.gameName ?? text.selectedPlace
  }

  function getTabLabel(tab: Tab) {
    return {
      editor: text.editor,
      console: text.console,
      datastore: text.datastore,
      sessions: text.sessions,
      tokens: text.tokens,
      settings: text.settings
    }[tab]
  }

  function getTokenTimeLeft() {
    return Math.max(0, (tokenInfo?.expiresAt ?? 0) - now)
  }

  function getTopbarTitle() {
    return {
      editor: activeScript?.name ?? "main.rsql",
      console: text.runtimeConsole,
      datastore: text.dataStoreAccess,
      sessions: text.sessions,
      tokens: text.tokensTitle,
      settings: text.settingsTitle
    }[activeTab]
  }

  function openTokenToast() {
    if (tokenToastTimeoutRef.current !== null) {
      window.clearTimeout(tokenToastTimeoutRef.current)
    }

    setShowTokenToast(true)
    setClosingTokenToast(false)
    tokenToastTimeoutRef.current = window.setTimeout(closeTokenToast, 5000)
  }

  function closeTokenToast() {
    if (tokenToastTimeoutRef.current !== null) {
      window.clearTimeout(tokenToastTimeoutRef.current)
      tokenToastTimeoutRef.current = null
    }

    setClosingTokenToast(true)

    window.setTimeout(() => {
      setShowTokenToast(false)
      setClosingTokenToast(false)
    }, 300)
  }

  function setPlayerTemplate(nextCode: string) {
    updateActiveScript(nextCode)
    setActiveTab("editor")
  }

  function updateSettings(nextSettings: Partial<AppSettings>) {
    const mergedSettings = normalizeSettings({
      ...settings,
      ...nextSettings
    })

    setSettings(mergedSettings)

    void saveSettings(mergedSettings).catch(() => {
      setConsoleLines((current) => [
        ...current,
        {
          level: "warning",
          message: text.cannotSaveSettings
        }
      ])
    })
  }

  function updateActiveScript(nextCode: string) {
    setScripts((current) => current.map((script) => (
      script.id === activeScript?.id
        ? { ...script, code: nextCode }
        : script
    )))
  }

  function createScript() {
    const scriptNumber = scripts.length + 1
    const nextScript = {
      id: createScriptId(),
      name: `Script #${scriptNumber}`,
      code: ""
    }

    setScripts((current) => [...current, nextScript])
    setActiveScriptId(nextScript.id)
    setActiveTab("editor")
  }

  function deleteActiveScript() {
    if (!activeScript) return

    if (scripts.length === 1) {
      const replacement = {
        id: createScriptId(),
        name: "main.rsql",
        code: starterCode
      }

      setScripts([replacement])
      setActiveScriptId(replacement.id)
      return
    }

    const activeIndex = scripts.findIndex((script) => script.id === activeScript.id)
    const nextScripts = scripts.filter((script) => script.id !== activeScript.id)
    const nextActive = nextScripts[Math.max(0, activeIndex - 1)]

    setScripts(nextScripts)
    setActiveScriptId(nextActive.id)
  }

  function saveActiveScript() {
    if (!activeScript) return

    const blob = new Blob([activeScript.code], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")

    anchor.href = url
    anchor.download = activeScript.name.endsWith(".rsql")
      ? activeScript.name
      : `${activeScript.name}.rsql`
    anchor.click()

    URL.revokeObjectURL(url)
  }

  function renameActiveScript() {
    if (!activeScript) return

    const nextName = window.prompt(text.renamePrompt, activeScript.name)?.trim()

    if (!nextName) return

    setScripts((current) => current.map((script) => (
      script.id === activeScript.id
        ? { ...script, name: nextName }
        : script
    )))
  }

  function openScriptPicker() {
    fileInputRef.current?.click()
  }

  async function openScript(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) return

    const nextScript = {
      id: createScriptId(),
      name: file.name,
      code: await file.text()
    }

    setScripts((current) => [...current, nextScript])
    setActiveScriptId(nextScript.id)
    setActiveTab("editor")
    event.target.value = ""
  }

  async function copyToken(closeToastAfterCopy = false) {
    if (!tokenInfo) return

    await navigator.clipboard.writeText(tokenInfo.value)
    setTokenCopied(true)

    if (closeToastAfterCopy) {
      closeTokenToast()
    }
  }

  function renderPanel() {
    if (activeTab === "console") {
      return (
        <section className="panel console-panel">
          <div className="panel-header">
            <span>{text.runtimeConsole}</span>

            <button
              className="text-button"
              onClick={() => setConsoleLines(createInitialConsole(text.initialConsole))}
            >
              {text.clear}
            </button>
          </div>

          <div className="console-content">
            {consoleLines.map((line, index) => (
              <pre
                className={`console-line ${line.level}`}
                key={`${line.message}-${index}`}
              >
                {line.message}
              </pre>
            ))}
          </div>
        </section>
      )
    }

    if (activeTab === "datastore") {
      return (
        <section className="panel data-panel">
          <div className="panel-header">
            <span>{text.dataStoreAccess}</span>
          </div>

          <div className="data-access">
            <h3>{text.liveStudioDataStores}</h3>
            <p>{text.dataStoreIntro}</p>

            <div className="quick-actions">
              <button
                className="text-button"
                onClick={() => setPlayerTemplate(`SELECTUSERID 123456789

SELECT * FROM PlayerData
WHERE Coins >= 100
PRINT`)}
              >
                {text.getPlayerData}
              </button>

              <button
                className="text-button"
                onClick={() => setPlayerTemplate(`SELECTUSERID 123456789

SET PlayerData.Coins += 500
PRINT`)}
              >
                {text.addCoins}
              </button>
            </div>

            <pre>{`SELECTUSERID 123456789

-- IMPORT SharedRsqlLibrary
-- IMPORT URL("https://example.com/library.rsql")

VAR minimumCoins:Int = 100
VAR bonus:Int = 500
VAR isTester:Bool = true

FUNCTION AddCoins amount
SET PlayerData.Coins += $amount
SET PlayerData.IsTester = $isTester
PRINT
END

SELECT * FROM PlayerData
WHERE Coins >= $minimumCoins
PRINT

CALL AddCoins $bonus`}</pre>
          </div>
        </section>
      )
    }

    if (activeTab === "sessions") {
      return (
        <section className="panel sessions-panel">
          <div className="panel-header">
            <span>{text.sessions}</span>

            <button
              className="text-button"
              onClick={refreshRuntime}
            >
              {text.refresh}
            </button>
          </div>

          <div className="session-list">
            {sessions.length === 0 && (
              <div className="empty-state">{text.noStudioSessions}</div>
            )}

            {sessions.map((session) => (
              <article
                className={`session-card ${selectedTarget === session.sessionId ? "selected" : ""}`}
                key={session.sessionId}
              >
                <div>
                  <h3>{session.gameName}</h3>
                  <p>{session.placeId ?? text.noPlaceId}</p>
                </div>

                <span className={session.connected ? "badge ok" : "badge"}>
                  {session.connected ? text.connected : text.idle}
                </span>

                <button
                  className={`text-button ${selectedTarget === session.sessionId ? "selected" : ""}`}
                  disabled={!session.connected}
                  onClick={() => setSelectedTarget(session.sessionId)}
                >
                  {text.select}
                </button>

                <button
                  className="text-button danger"
                  disabled={disconnectingSessionId === session.sessionId}
                  onClick={() => handleDisconnect(session.sessionId)}
                >
                  {text.disconnect}
                </button>
              </article>
            ))}
          </div>
        </section>
      )
    }

    if (activeTab === "tokens") {
      const timeLeft = getTokenTimeLeft()
      const isExpired = tokenInfo !== null && timeLeft <= 0

      return (
        <section className="panel tokens-panel">
          <div className="panel-header">
            <span>{text.tokensTitle}</span>

            <button
              className="text-button"
              onClick={handleGenerateToken}
            >
              {text.generateToken}
            </button>
          </div>

          <div className="tokens-content">
            <section className="token-card">
              <div>
                <h3>{text.tokensTitle}</h3>
                <p>{text.tokensHint}</p>
              </div>

              {!tokenInfo && (
                <div className="empty-token-state">
                  <h4>{text.noTokenTitle}</h4>
                  <p>{text.noTokenDescription}</p>
                </div>
              )}

              {tokenInfo && (
                <>
                  <div className="token-meta-grid">
                    <div className={`token-expiry ${isExpired ? "expired" : ""}`}>
                      <span>{isExpired ? text.expired : text.expiresIn}</span>
                      <strong>{isExpired ? "00:00" : formatDuration(timeLeft)}</strong>
                    </div>

                    <div className="token-expiry">
                      <span>{text.validUntil}</span>
                      <strong>{new Date(tokenInfo.expiresAt).toLocaleString()}</strong>
                    </div>
                  </div>

                  <div className="token-value-block">
                    <span>{text.tokenValue}</span>
                    <code>{tokenInfo.value}</code>
                  </div>

                  <div className="token-actions">
                    <button
                      className="run-button"
                      disabled={isExpired}
                      onClick={() => copyToken()}
                    >
                      {tokenCopied ? text.copied : text.copyToken}
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>
        </section>
      )
    }

    if (activeTab === "settings") {
      return (
        <section className="panel settings-panel">
          <div className="panel-header">
            <span>{text.settingsTitle}</span>
          </div>

          <div className="settings-content">
            <section className="settings-group">
              <div>
                <h3>{text.languageTitle}</h3>
                <p>{text.languageHint}</p>
              </div>

              <div className="option-row">
                {languageOptions.map((option) => (
                  <button
                    className={`option-button ${settings.language === option.code ? "active" : ""}`}
                    key={option.code}
                    onClick={() => updateSettings({ language: option.code })}
                  >
                    <span>{text[option.labelKey]}</span>
                    <small>{option.nativeLabel}</small>
                  </button>
                ))}
              </div>
            </section>

            <section className="settings-group">
              <div>
                <h3>{text.themeTitle}</h3>
                <p>{text.themeHint}</p>
              </div>

              <div className="option-row theme-options">
                {themeOptions.map((option) => (
                  <button
                    className={`option-button theme-option ${settings.theme === option.code ? "active" : ""}`}
                    key={option.code}
                    onClick={() => updateSettings({ theme: option.code })}
                  >
                    <span className={`theme-swatch ${option.code}`} />
                    <span>{text[option.labelKey]}</span>
                    <small>{text[option.hintKey]}</small>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </section>
      )
    }

    return (
      <section className="panel editor-panel">
        <div className="script-topbar">
          <div className="script-tabs">
            {scripts.map((script) => (
              <button
                className={`script-tab ${activeScript?.id === script.id ? "active" : ""}`}
                key={script.id}
                onClick={() => setActiveScriptId(script.id)}
                title={script.name}
              >
                <span>{script.name}</span>
              </button>
            ))}
          </div>

          <div className="script-actions">
            <button
              className="script-action"
              onClick={createScript}
            >
              {text.create}
            </button>

            <button
              className="script-action"
              onClick={saveActiveScript}
            >
              {text.save}
            </button>

            <button
              className="script-action"
              onClick={renameActiveScript}
            >
              {text.rename}
            </button>

            <button
              className="script-action"
              onClick={openScriptPicker}
            >
              {text.open}
            </button>

            <button
              className="script-action danger"
              onClick={deleteActiveScript}
            >
              {text.delete}
            </button>
          </div>

          <input
            ref={fileInputRef}
            className="hidden-file-input"
            type="file"
            accept=".rsql,.txt,text/plain"
            onChange={openScript}
          />
        </div>

        <div className="editor-content monaco-wrapper">
          <CodeEditor
            value={code}
            onChange={updateActiveScript}
            theme={settings.theme}
          />
        </div>
      </section>
    )
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div>
          <div className="logo">
            <img
              className="logo-image"
              src={rsqlLogoUrl}
              alt="RSQL"
            />

            <div>
              <h1>RSQL</h1>
              <p>{text.appSubtitle}</p>
            </div>
          </div>

          <nav className="sidebar-section">
            {(["editor", "console", "datastore", "sessions", "tokens", "settings"] as Tab[]).map((tab) => (
              <button
                className={`sidebar-button ${activeTab === tab ? "active" : ""}`}
                key={tab}
                onClick={() => setActiveTab(tab)}
              >
                {getTabLabel(tab)}
              </button>
            ))}
          </nav>
        </div>

        <div className="status-card">
          <span className={`status-dot ${bridgeStatus === "ready" ? "online" : ""}`} />

          <div>
            <h3>
              {bridgeStatus === "ready"
                ? text.bridgeOnline
                : bridgeStatus === "outdated"
                  ? text.bridgeOutdated
                  : text.disconnected}
            </h3>
            <p>
              {connectedSessions.length > 0
                ? getTargetLabel()
                : bridgeStatus === "outdated"
                  ? text.restartBridge
                  : text.noStudioConnected}
            </p>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h2>{getTopbarTitle()}</h2>
            <p>{connectedSessions.length > 0 ? getTargetLabel() : text.studioRequired}</p>
          </div>

          <div className="topbar-buttons">
            <button
              className={`target-button ${selectedTarget === "all" ? "active" : ""}`}
              disabled={connectedSessions.length === 0}
              onClick={() => setSelectedTarget("all")}
            >
              {text.allPlaces}
            </button>

            <button
              className="token-button"
              onClick={handleGenerateToken}
            >
              {text.generateToken}
            </button>

            {selectedTarget !== "all" && selectedSession && (
              <button
                className="disconnect-button"
                disabled={disconnectingSessionId === selectedSession.sessionId}
                onClick={() => handleDisconnect(selectedSession.sessionId)}
              >
                {text.disconnect}
              </button>
            )}

            <button
              className="run-button"
              disabled={isExecuting || targetSessionIds.length === 0}
              onClick={handleExecute}
            >
              {isExecuting ? text.running : text.execute}
            </button>
          </div>
        </header>

        <div className="workspace">
          {renderPanel()}
        </div>
      </main>

      {showTokenToast && tokenInfo && (
        <div className={`token-toast ${closingTokenToast ? "closing" : ""}`}>
          <div className="token-toast-content">
            <h4>{text.tokenGenerated}</h4>
            <p>{tokenInfo.value}</p>
          </div>

          <button
            className="copy-button"
            onClick={() => copyToken(true)}
          >
            {tokenCopied ? text.copied : text.copy}
          </button>
        </div>
      )}
    </div>
  )
}

function createScriptId() {
  return `script-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`
  }

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}

function normalizeSettings(value: Partial<AppSettings> | null | undefined): AppSettings {
  return {
    language: isLanguageCode(value?.language) ? value.language : defaultSettings.language,
    theme: isThemeCode(value?.theme) ? value.theme : defaultSettings.theme
  }
}

function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(settingsStorageKey)
    const parsed = stored ? JSON.parse(stored) : null

    return normalizeSettings(parsed)
  } catch {
    localStorage.removeItem(settingsStorageKey)
  }

  return defaultSettings
}

function isLanguageCode(value: unknown): value is LanguageCode {
  return value === "en" || value === "es" || value === "pt"
}

function isThemeCode(value: unknown): value is ThemeCode {
  return value === "dark" || value === "light" || value === "midnight"
}

function loadScripts(): ScriptDocument[] {
  try {
    const stored = localStorage.getItem(scriptsStorageKey)
    const parsed = stored ? JSON.parse(stored) : null

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
        .filter((script) => (
          typeof script?.id === "string" &&
          typeof script?.name === "string" &&
          typeof script?.code === "string"
        ))
        .map((script) => ({
          id: script.id,
          name: script.name,
          code: script.code === legacyStarterCode ||
            script.code === whereStarterCode ||
            script.code === functionStarterCode
            ? starterCode
            : script.code
        }))
    }
  } catch {
    localStorage.removeItem(scriptsStorageKey)
  }

  return [
    {
      id: createScriptId(),
      name: "main.rsql",
      code: starterCode
    }
  ]
}
