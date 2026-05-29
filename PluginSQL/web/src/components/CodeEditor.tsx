import { useEffect, useRef, useState } from "react"
import Editor from "@monaco-editor/react"
import type { OnMount } from "@monaco-editor/react"
import type * as MonacoEditor from "monaco-editor"
import { setupLanguage } from "../core/language/setupLanguage"
import type { RsqlEditorTheme } from "../core/language/setupLanguage"

type CodeEditorProps = {
    value: string
    onChange: (value: string) => void
    theme: "dark" | "light" | "midnight"
}

type Suggestion = {
    label: string
    detail: string
    insertText: string
    cursorOffset?: number
}

type SuggestState = {
    items: Suggestion[]
    left: number
    top: number
    maxHeight: number
    startColumn: number
    endColumn: number
    lineNumber: number
}

const suggestionMaxHeight = 220
const suggestionMinHeight = 36
const suggestionEdgePadding = 8

const rsqlSuggestions: Suggestion[] = [
    {
        label: "SELECTUSERID",
        detail: "Select player",
        insertText: "SELECTUSERID"
    },
    {
        label: "SELECT",
        detail: "Read fields",
        insertText: "SELECT"
    },
    {
        label: "FROM",
        detail: "DataStore source",
        insertText: "FROM"
    },
    {
        label: "GET",
        detail: "Read DataStore",
        insertText: "GET"
    },
    {
        label: "SET",
        detail: "Write DataStore",
        insertText: "SET"
    },
    {
        label: "VAR",
        detail: "Typed variable",
        insertText: "VAR"
    },
    {
        label: "IMPORT",
        detail: "ModuleScript",
        insertText: "IMPORT"
    },
    {
        label: "WHERE",
        detail: "Filter result",
        insertText: "WHERE"
    },
    {
        label: "FUNCTION",
        detail: "Define block",
        insertText: "FUNCTION"
    },
    {
        label: "CALL",
        detail: "Run function",
        insertText: "CALL"
    },
    {
        label: "END",
        detail: "Close block",
        insertText: "END"
    },
    {
        label: "PRINT",
        detail: "Print result",
        insertText: "PRINT"
    },
    {
        label: "DELETE",
        detail: "Delete record",
        insertText: "DELETE"
    },
    {
        label: "PlayerData",
        detail: "Store",
        insertText: "PlayerData"
    },
    {
        label: "ServerConfig",
        detail: "Store",
        insertText: "ServerConfig"
    },
    {
        label: "Coins",
        detail: "Field",
        insertText: "Coins"
    },
    {
        label: "Int",
        detail: "Type",
        insertText: "Int"
    },
    {
        label: "Bool",
        detail: "Type",
        insertText: "Bool"
    },
    {
        label: "String",
        detail: "Type",
        insertText: "String"
    },
    {
        label: "Float",
        detail: "Type",
        insertText: "Float"
    },
    {
        label: "Json",
        detail: "Type",
        insertText: "Json"
    }
]

const importSuggestions: Suggestion[] = [
    {
        label: "URL",
        detail: "Remote RSQL",
        insertText: "URL()",
        cursorOffset: 4
    }
]

const fromSuggestions: Suggestion[] = [
    {
        label: "FROM",
        detail: "DataStore source",
        insertText: "FROM"
    }
]

export default function CodeEditor({
    value,
    onChange,
    theme
}: CodeEditorProps) {
    const editorRef = useRef<MonacoEditor.editor.IStandaloneCodeEditor | null>(null)
    const monacoRef = useRef<Parameters<OnMount>[1] | null>(null)
    const suggestStateRef = useRef<SuggestState | null>(null)
    const activeIndexRef = useRef(0)
    const [suggestState, setSuggestState] = useState<SuggestState | null>(null)
    const [activeIndex, setActiveIndex] = useState(0)
    const editorTheme = `rsql-${theme}` as RsqlEditorTheme

    useEffect(() => {
        monacoRef.current?.editor.setTheme(editorTheme)
    }, [editorTheme])

    const handleEditorDidMount: OnMount = (editor, monaco) => {
        editorRef.current = editor
        monacoRef.current = monaco
        monaco.editor.setTheme(editorTheme)
        editor.focus()

        editor.onDidChangeModelContent(() => refreshSuggestions(editor))
        editor.onDidChangeCursorPosition(() => refreshSuggestions(editor))
        editor.onDidBlurEditorWidget(() => window.setTimeout(() => updateSuggestState(null), 120))
        editor.onKeyDown((event) => {
            const currentSuggest = suggestStateRef.current

            if (!currentSuggest) {
                return
            }

            if (event.keyCode === monaco.KeyCode.Enter || event.keyCode === monaco.KeyCode.Tab) {
                event.preventDefault()
                event.stopPropagation()
                applySuggestion()
                return
            }

            if (event.keyCode === monaco.KeyCode.DownArrow) {
                event.preventDefault()
                event.stopPropagation()
                updateActiveIndex(activeIndexRef.current + 1)
                return
            }

            if (event.keyCode === monaco.KeyCode.UpArrow) {
                event.preventDefault()
                event.stopPropagation()
                updateActiveIndex(activeIndexRef.current - 1)
                return
            }

            if (event.keyCode === monaco.KeyCode.Escape) {
                event.preventDefault()
                event.stopPropagation()
                updateSuggestState(null)
            }
        })
        editor.addCommand(
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space,
            () => refreshSuggestions(editor, true)
        )
        editor.addCommand(
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.Semicolon,
            () => {
                updateSuggestState(null)
                editor.trigger("keyboard", "editor.action.commentLine", null)
            }
        )
    }

    function updateSuggestState(nextState: SuggestState | null) {
        suggestStateRef.current = nextState
        setSuggestState(nextState)

        if (!nextState) {
            updateActiveIndex(0)
        }
    }

    function updateActiveIndex(nextIndex: number) {
        const count = suggestStateRef.current?.items.length ?? 0
        const normalizedIndex = count === 0
            ? 0
            : ((nextIndex % count) + count) % count

        activeIndexRef.current = normalizedIndex
        setActiveIndex(normalizedIndex)

        window.requestAnimationFrame(() => {
            const activeElement = document.querySelector(".rsql-suggest-item.active")
            activeElement?.scrollIntoView({
                block: "nearest"
            })
        })
    }

    function refreshSuggestions(
        editor: MonacoEditor.editor.IStandaloneCodeEditor,
        force = false
    ) {
        const model = editor.getModel()
        const position = editor.getPosition()

        if (!model || !position) {
            updateSuggestState(null)
            return
        }

        const word = model.getWordUntilPosition(position)
        const prefix = word.word.toUpperCase()
        const lineContent = model.getLineContent(position.lineNumber)
        const beforeWord = lineContent.slice(0, word.startColumn - 1)
        const isImportTarget = /^\s*IMPORT\s+$/i.test(beforeWord)
        const isSelectFromTarget = /^\s*SELECT\s+.+\s+$/i.test(beforeWord) &&
            !/\sFROM\s/i.test(beforeWord)

        if (!force && prefix.length === 0 && !isImportTarget && !isSelectFromTarget) {
            updateSuggestState(null)
            return
        }

        const suggestionSource = isImportTarget
            ? importSuggestions
            : isSelectFromTarget
                ? fromSuggestions
                : rsqlSuggestions
        const items = suggestionSource.filter((item) => (
            prefix.length === 0 ||
            item.label.toUpperCase().startsWith(prefix)
        ))

        if (items.length === 0) {
            updateSuggestState(null)
            return
        }

        const visiblePosition = editor.getScrolledVisiblePosition({
            lineNumber: position.lineNumber,
            column: word.startColumn
        })

        if (!visiblePosition) {
            updateSuggestState(null)
            return
        }

        const layoutInfo = editor.getLayoutInfo()
        const wantedTop = visiblePosition.top + visiblePosition.height + 4
        const availableBelow = layoutInfo.height - wantedTop - suggestionEdgePadding
        const maxHeight = Math.min(
            suggestionMaxHeight,
            Math.max(suggestionMinHeight, availableBelow)
        )
        const top = availableBelow < suggestionMinHeight
            ? Math.max(
                suggestionEdgePadding,
                layoutInfo.height - suggestionMinHeight - suggestionEdgePadding
            )
            : wantedTop

        updateSuggestState({
            items,
            left: Math.max(0, visiblePosition.left),
            top,
            maxHeight,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
            lineNumber: position.lineNumber
        })
        updateActiveIndex(0)
    }

    function applySuggestion(suggestion?: Suggestion) {
        const editor = editorRef.current
        const currentSuggest = suggestStateRef.current
        const selectedSuggestion = suggestion ?? currentSuggest?.items[activeIndexRef.current]

        if (!editor || !currentSuggest || !selectedSuggestion) {
            return
        }

        editor.executeEdits("rsql-autocomplete", [
            {
                range: {
                    startLineNumber: currentSuggest.lineNumber,
                    endLineNumber: currentSuggest.lineNumber,
                    startColumn: currentSuggest.startColumn,
                    endColumn: currentSuggest.endColumn
                },
                text: selectedSuggestion.insertText
            }
        ])

        const insertedLines = selectedSuggestion.insertText.split(/\r?\n/)
        const lastInsertedLine = insertedLines[insertedLines.length - 1]

        if (selectedSuggestion.cursorOffset !== undefined && insertedLines.length === 1) {
            editor.setPosition({
                lineNumber: currentSuggest.lineNumber,
                column: currentSuggest.startColumn + selectedSuggestion.cursorOffset
            })
        } else {
            editor.setPosition({
                lineNumber: currentSuggest.lineNumber + insertedLines.length - 1,
                column: insertedLines.length === 1
                    ? currentSuggest.startColumn + lastInsertedLine.length
                    : lastInsertedLine.length + 1
            })
        }
        updateSuggestState(null)
        editor.focus()
    }

    return (
        <div className="editor-shell">
            <Editor

                beforeMount={setupLanguage}

                onMount={handleEditorDidMount}

                height="100%"

                defaultLanguage="rsql"

                value={value}

                onChange={(nextValue) => onChange(nextValue ?? "")}

                theme={editorTheme}

                options={{

                    quickSuggestions: false,

                    suggestOnTriggerCharacters: false,

                    acceptSuggestionOnEnter: "off",

                    wordBasedSuggestions: "off",

                    fixedOverflowWidgets: true,

                    parameterHints: {
                        enabled: true
                    },

                    minimap: {
                        enabled: false
                    },

                    fontSize: 15,

                    fontFamily: "Consolas",

                    smoothScrolling: true,

                    cursorSmoothCaretAnimation: "on",

                    bracketPairColorization: {
                        enabled: true
                    },

                    padding: {
                        top: 20
                    },

                    roundedSelection: true,

                    scrollBeyondLastLine: false,

                    automaticLayout: true
                }}
            />

            {suggestState && (
                <div
                    className="rsql-suggest"
                    style={{
                        left: suggestState.left,
                        top: suggestState.top,
                        maxHeight: suggestState.maxHeight
                    }}
                >
                    {suggestState.items.map((suggestion, index) => (
                        <button
                            className={`rsql-suggest-item ${index === activeIndex ? "active" : ""}`}
                            key={suggestion.label}
                            onMouseDown={(event) => {
                                event.preventDefault()
                                applySuggestion(suggestion)
                            }}
                        >
                            <span>{suggestion.label}</span>
                            <small>{suggestion.detail}</small>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
