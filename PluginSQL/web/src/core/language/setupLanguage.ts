import * as monaco from "monaco-editor"

let isRegistered = false

export type RsqlEditorTheme = "rsql-dark" | "rsql-light" | "rsql-midnight"

export function setupLanguage(monacoApi: typeof monaco = monaco) {
  if (isRegistered) {
    return
  }

  isRegistered = true

  monacoApi.languages.register({
    id: "rsql"
  })

  monacoApi.languages.setLanguageConfiguration("rsql", {
    comments: {
      lineComment: "--"
    },
    brackets: [
      ["(", ")"],
      ["[", "]"]
    ],
    autoClosingPairs: [
      { open: "(", close: ")" },
      { open: "[", close: "]" },
      { open: "\"", close: "\"" },
      { open: "'", close: "'" }
    ]
  })

  monacoApi.languages.setMonarchTokensProvider("rsql", {
    tokenizer: {
      root: [
        [/--.*$/, "comment"],
        [/\b(SELECTUSERID|SELECT|FROM|GET|SET|WHERE|FUNCTION|CALL|END|PRINT|DELETE|VAR|IMPORT|URL)\b/i, "keyword"],
        [/\b(Int|Integer|Float|Number|Bool|Boolean|String|Json|Table|Object|Any)\b/i, "type"],
        [/\$[a-zA-Z_][\w]*/, "variable"],
        [/\b(true|false|null)\b/, "constant"],
        [/-?[0-9]+(\.[0-9]+)?/, "number"],
        [/".*?"/, "string"],
        [/'[^']*'/, "string"],
        [/[a-zA-Z_][\w]*/, "identifier"]
      ]
    }
  })

  monacoApi.languages.registerCompletionItemProvider("rsql", {
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position)
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      }
      const beforeWord = model.getLineContent(position.lineNumber).slice(0, word.startColumn - 1)
      const isImportTarget = /^\s*IMPORT\s+$/i.test(beforeWord)
      const isSelectFromTarget = /^\s*SELECT\s+.+\s+$/i.test(beforeWord) &&
        !/\sFROM\s/i.test(beforeWord)

      if (isImportTarget) {
        return {
          suggestions: [
            {
              label: "URL",
              kind: monacoApi.languages.CompletionItemKind.Function,
              range,
              insertText: "URL($1)",
              insertTextRules:
                monacoApi.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "Import RSQL functions from a remote URL"
            }
          ]
        }
      }

      if (isSelectFromTarget) {
        return {
          suggestions: [
            {
              label: "FROM",
              kind: monacoApi.languages.CompletionItemKind.Keyword,
              range,
              insertText: "FROM",
              documentation: "Choose the DataStore source for SELECT"
            }
          ]
        }
      }

      return {
        suggestions: [
          {
            label: "SELECTUSERID",
            kind: monacoApi.languages.CompletionItemKind.Keyword,
            range,
            insertText: "SELECTUSERID",
            documentation: "Select the player key used by player-focused RSQL commands"
          },
          {
            label: "SELECT",
            kind: monacoApi.languages.CompletionItemKind.Keyword,
            range,
            insertText: "SELECT",
            documentation: "Read fields from a DataStore record"
          },
          {
            label: "FROM",
            kind: monacoApi.languages.CompletionItemKind.Keyword,
            range,
            insertText: "FROM",
            documentation: "Choose the DataStore source for SELECT"
          },
          {
            label: "VAR",
            kind: monacoApi.languages.CompletionItemKind.Keyword,
            range,
            insertText: "VAR",
            documentation: "Create a typed RSQL variable"
          },
          {
            label: "GET",
            kind: monacoApi.languages.CompletionItemKind.Keyword,
            range,
            insertText: "GET",
            documentation: "Read a record from a DataStore"
          },
          {
            label: "IMPORT",
            kind: monacoApi.languages.CompletionItemKind.Keyword,
            range,
            insertText: "IMPORT",
            documentation: "Import RSQL functions from a Studio ModuleScript"
          },
          {
            label: "SET",
            kind: monacoApi.languages.CompletionItemKind.Keyword,
            range,
            insertText: "SET",
            documentation: "Write a value to a DataStore field"
          },
          {
            label: "WHERE",
            kind: monacoApi.languages.CompletionItemKind.Keyword,
            range,
            insertText: "WHERE",
            documentation: "Filter the last GET result by a field condition"
          },
          {
            label: "FUNCTION",
            kind: monacoApi.languages.CompletionItemKind.Keyword,
            range,
            insertText: "FUNCTION",
            documentation: "Define a reusable RSQL function block"
          },
          {
            label: "CALL",
            kind: monacoApi.languages.CompletionItemKind.Keyword,
            range,
            insertText: "CALL",
            documentation: "Execute a defined RSQL function"
          },
          {
            label: "END",
            kind: monacoApi.languages.CompletionItemKind.Keyword,
            range,
            insertText: "END",
            documentation: "Close a FUNCTION block"
          },
          {
            label: "PRINT",
            kind: monacoApi.languages.CompletionItemKind.Keyword,
            range,
            insertText: "PRINT",
            documentation: "Print the last command result"
          },
          {
            label: "DELETE",
            kind: monacoApi.languages.CompletionItemKind.Keyword,
            range,
            insertText: "DELETE",
            documentation: "Delete a DataStore record"
          },
          {
            label: "PlayerData",
            kind: monacoApi.languages.CompletionItemKind.Variable,
            range,
            insertText: "PlayerData"
          },
          {
            label: "ServerConfig",
            kind: monacoApi.languages.CompletionItemKind.Variable,
            range,
            insertText: "ServerConfig"
          },
          {
            label: "Coins",
            kind: monacoApi.languages.CompletionItemKind.Field,
            range,
            insertText: "Coins"
          },
          ...["Int", "Bool", "String", "Float", "Json", "Any"].map((typeName) => ({
            label: typeName,
            kind: monacoApi.languages.CompletionItemKind.TypeParameter,
            range,
            insertText: typeName
          }))
        ]
      }
    }
  })

  monacoApi.editor.defineTheme("rsql-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      {
        token: "keyword",
        foreground: "60A5FA",
        fontStyle: "bold"
      },
      {
        token: "type",
        foreground: "F472B6",
        fontStyle: "bold"
      },
      {
        token: "number",
        foreground: "F59E0B"
      },
      {
        token: "string",
        foreground: "4ADE80"
      },
      {
        token: "identifier",
        foreground: "E2E8F0"
      },
      {
        token: "variable",
        foreground: "C084FC"
      },
      {
        token: "comment",
        foreground: "6B7280",
        fontStyle: "italic"
      }
    ],
    colors: {
      "editor.background": "#0D1117",
      "editor.foreground": "#E2E8F0",
      "editorLineNumber.foreground": "#56616F",
      "editorLineNumber.activeForeground": "#B8C4D4",
      "editorCursor.foreground": "#60A5FA",
      "editor.selectionBackground": "#1F6FEB66",
      "editor.inactiveSelectionBackground": "#1F6FEB33",
      "editor.lineHighlightBackground": "#161B22",
      "editor.lineHighlightBorder": "#161B22",
      "editorIndentGuide.background1": "#263241",
      "editorIndentGuide.activeBackground1": "#4B5C70",
      "editorGutter.background": "#0D1117",
      "editorWidget.background": "#111827",
      "editorWidget.foreground": "#E2E8F0",
      "editorWidget.border": "#263241",
      "editorBracketMatch.background": "#1F6FEB33",
      "editorBracketMatch.border": "#60A5FA",
      "editorSuggestWidget.background": "#111827",
      "editorSuggestWidget.foreground": "#E2E8F0",
      "editorSuggestWidget.selectedBackground": "#1B2A3A",
      "editorSuggestWidget.selectedForeground": "#FFFFFF",
      "editorSuggestWidget.highlightForeground": "#60A5FA",
      "editorSuggestWidget.border": "#263241",
      "list.focusBackground": "#1B2A3A",
      "list.focusForeground": "#FFFFFF",
      "list.activeSelectionBackground": "#1B2A3A",
      "list.activeSelectionForeground": "#FFFFFF",
      "list.hoverBackground": "#111827",
      "list.hoverForeground": "#E2E8F0",
      "editorHoverWidget.background": "#111827",
      "editorHoverWidget.foreground": "#E2E8F0",
      "editorHoverWidget.border": "#263241",
      "input.background": "#111827",
      "input.foreground": "#E2E8F0",
      "input.border": "#263241",
      "scrollbar.shadow": "#00000000",
      "scrollbarSlider.background": "#30363D99",
      "scrollbarSlider.hoverBackground": "#3F4A5599",
      "scrollbarSlider.activeBackground": "#56616F",
      "minimap.background": "#0D1117"
    }
  })

  monacoApi.editor.defineTheme("rsql-light", {
    base: "vs",
    inherit: true,
    rules: [
      {
        token: "keyword",
        foreground: "2563EB",
        fontStyle: "bold"
      },
      {
        token: "type",
        foreground: "C026D3",
        fontStyle: "bold"
      },
      {
        token: "number",
        foreground: "B45309"
      },
      {
        token: "string",
        foreground: "15803D"
      },
      {
        token: "identifier",
        foreground: "1F2937"
      },
      {
        token: "variable",
        foreground: "7C3AED"
      },
      {
        token: "comment",
        foreground: "64748B",
        fontStyle: "italic"
      }
    ],
    colors: {
      "editor.background": "#F8FAFC",
      "editor.foreground": "#1F2937",
      "editorLineNumber.foreground": "#94A3B8",
      "editorLineNumber.activeForeground": "#334155",
      "editorCursor.foreground": "#2563EB",
      "editor.selectionBackground": "#BFDBFE",
      "editor.inactiveSelectionBackground": "#DBEAFE",
      "editor.lineHighlightBackground": "#EEF6FF",
      "editor.lineHighlightBorder": "#EEF6FF",
      "editorIndentGuide.background1": "#D8E1EC",
      "editorIndentGuide.activeBackground1": "#8DA2BA",
      "editorGutter.background": "#F8FAFC",
      "editorWidget.background": "#FFFFFF",
      "editorWidget.foreground": "#0F172A",
      "editorWidget.border": "#CBD5E1",
      "editorBracketMatch.background": "#DBEAFE",
      "editorBracketMatch.border": "#2563EB",
      "editorSuggestWidget.background": "#FFFFFF",
      "editorSuggestWidget.foreground": "#0F172A",
      "editorSuggestWidget.selectedBackground": "#DBEAFE",
      "editorSuggestWidget.selectedForeground": "#0F172A",
      "editorSuggestWidget.highlightForeground": "#2563EB",
      "editorSuggestWidget.border": "#CBD5E1",
      "list.focusBackground": "#DBEAFE",
      "list.focusForeground": "#0F172A",
      "list.activeSelectionBackground": "#DBEAFE",
      "list.activeSelectionForeground": "#0F172A",
      "list.hoverBackground": "#EEF2F7",
      "list.hoverForeground": "#0F172A",
      "editorHoverWidget.background": "#FFFFFF",
      "editorHoverWidget.foreground": "#0F172A",
      "editorHoverWidget.border": "#CBD5E1",
      "input.background": "#FFFFFF",
      "input.foreground": "#0F172A",
      "input.border": "#CBD5E1",
      "scrollbar.shadow": "#00000000",
      "scrollbarSlider.background": "#CBD5E199",
      "scrollbarSlider.hoverBackground": "#94A3B899",
      "scrollbarSlider.activeBackground": "#64748B",
      "minimap.background": "#F8FAFC"
    }
  })

  monacoApi.editor.defineTheme("rsql-midnight", {
    base: "vs-dark",
    inherit: true,
    rules: [
      {
        token: "keyword",
        foreground: "38BDF8",
        fontStyle: "bold"
      },
      {
        token: "type",
        foreground: "F0ABFC",
        fontStyle: "bold"
      },
      {
        token: "number",
        foreground: "FDBA74"
      },
      {
        token: "string",
        foreground: "86EFAC"
      },
      {
        token: "identifier",
        foreground: "E5E7EB"
      },
      {
        token: "variable",
        foreground: "C4B5FD"
      },
      {
        token: "comment",
        foreground: "64748B",
        fontStyle: "italic"
      }
    ],
    colors: {
      "editor.background": "#050816",
      "editor.foreground": "#E5E7EB",
      "editorLineNumber.foreground": "#56647A",
      "editorLineNumber.activeForeground": "#CBD5E1",
      "editorCursor.foreground": "#22D3EE",
      "editor.selectionBackground": "#155E7566",
      "editor.inactiveSelectionBackground": "#155E7533",
      "editor.lineHighlightBackground": "#0C1326",
      "editor.lineHighlightBorder": "#0C1326",
      "editorIndentGuide.background1": "#1E2A42",
      "editorIndentGuide.activeBackground1": "#4B638A",
      "editorGutter.background": "#050816",
      "editorWidget.background": "#07111F",
      "editorWidget.foreground": "#E5E7EB",
      "editorWidget.border": "#24364E",
      "editorBracketMatch.background": "#155E7533",
      "editorBracketMatch.border": "#22D3EE",
      "editorSuggestWidget.background": "#07111F",
      "editorSuggestWidget.foreground": "#E5E7EB",
      "editorSuggestWidget.selectedBackground": "#123044",
      "editorSuggestWidget.selectedForeground": "#FFFFFF",
      "editorSuggestWidget.highlightForeground": "#38BDF8",
      "editorSuggestWidget.border": "#24364E",
      "list.focusBackground": "#123044",
      "list.focusForeground": "#FFFFFF",
      "list.activeSelectionBackground": "#123044",
      "list.activeSelectionForeground": "#FFFFFF",
      "list.hoverBackground": "#0C1326",
      "list.hoverForeground": "#E5E7EB",
      "editorHoverWidget.background": "#07111F",
      "editorHoverWidget.foreground": "#E5E7EB",
      "editorHoverWidget.border": "#24364E",
      "input.background": "#07111F",
      "input.foreground": "#E5E7EB",
      "input.border": "#24364E",
      "scrollbar.shadow": "#00000000",
      "scrollbarSlider.background": "#24364E99",
      "scrollbarSlider.hoverBackground": "#34547699",
      "scrollbarSlider.activeBackground": "#587092",
      "minimap.background": "#050816"
    }
  })

  monacoApi.editor.setTheme("rsql-dark")
}
