import { useAppContext } from "@/context/AppContext"
import { useFileSystem } from "@/context/FileContext"
import { useSettings } from "@/context/SettingContext"
import { useSocket } from "@/context/SocketContext"
import usePageEvents from "@/hooks/usePageEvents"
import useResponsive from "@/hooks/useResponsive"
import { editorThemes } from "@/resources/Themes"
import { FileSystemItem } from "@/types/file"
import { SocketEvent } from "@/types/socket"

import { color } from "@uiw/codemirror-extensions-color"
import { hyperLink } from "@uiw/codemirror-extensions-hyper-link"
import { loadLanguage } from "@uiw/codemirror-extensions-langs"

import CodeMirror, {
  Extension,
  ViewUpdate,
  scrollPastEnd,
} from "@uiw/react-codemirror"

import { EditorView } from "@codemirror/view"
import { useEffect, useMemo, useRef, useState } from "react"

import {
  collaborativeHighlighting,
  updateRemoteUsers,
} from "./collaborativeHighlighting"

/* =====================================================
   LANGUAGE NORMALIZER (ALL PISTON → CODEMIRROR)
===================================================== */
const LANGUAGE_MAP: Record<string, string> = {
  javascript: "js",
  js: "js",
  typescript: "ts",
  ts: "ts",

  python: "py",
  py: "py",

  c: "c",
  cpp: "cpp",
  "c++": "cpp",

  java: "java",
  kotlin: "kt",

  go: "go",
  rust: "rs",
  ruby: "rb",
  php: "php",
  swift: "swift",
  dart: "dart",

  csharp: "cs",
  "c#": "cs",

  scala: "scala",
  haskell: "hs",
  lua: "lua",
  perl: "pl",

  bash: "bash",
  shell: "bash",
  powershell: "ps1",

  sql: "sql",
  sqlite3: "sql",

  r: "r",
  julia: "jl",

  plaintext: "markdown",
  text: "markdown",
}

function Editor() {
  const { users, currentUser } = useAppContext()
  const { activeFile, setActiveFile } = useFileSystem()
  const { theme, language, fontSize } = useSettings()
  const { socket } = useSocket()
  const { viewHeight } = useResponsive()

  const editorRef = useRef<any>(null)
  const [extensions, setExtensions] = useState<Extension[]>([])
  const [timeOut, setTimeOut] = useState<any>(null)

  const filteredUsers = useMemo(
    () => users.filter((u) => u.username !== currentUser.username),
    [users, currentUser],
  )

  /* ================= CODE CHANGE ================= */
  const onCodeChange = (code: string, view: ViewUpdate) => {
    if (!activeFile) return

    const file: FileSystemItem = { ...activeFile, content: code }
    setActiveFile(file)

    const cursorPosition = view.state.selection.main.head

    socket.emit(SocketEvent.TYPING_START, { cursorPosition })
    socket.emit(SocketEvent.FILE_UPDATED, {
      fileId: activeFile.id,
      newContent: code,
    })

    clearTimeout(timeOut)
    const newTimeOut = setTimeout(
      () => socket.emit(SocketEvent.TYPING_PAUSE),
      800,
    )
    setTimeOut(newTimeOut)
  }

  usePageEvents()

  /* ================= EXTENSIONS ================= */
  useEffect(() => {
    const base: Extension[] = [
      color,
      hyperLink,
      collaborativeHighlighting(),
      scrollPastEnd(),
    ]

    const key = LANGUAGE_MAP[language.toLowerCase()] || language.toLowerCase()
    const langExt = loadLanguage(key as any)

    if (langExt) {
      base.push(langExt)
    }

    setExtensions(base)
  }, [language])

  /* ================= REMOTE USERS ================= */
  useEffect(() => {
    if (editorRef.current?.view) {
      editorRef.current.view.dispatch({
        effects: updateRemoteUsers.of(filteredUsers),
      })
    }
  }, [filteredUsers])

  return (
    <CodeMirror
      ref={editorRef}
      value={activeFile?.content || ""}
      theme={editorThemes[theme]}
      extensions={extensions}
      onChange={onCodeChange}
      minHeight="100%"
      maxWidth="100vw"
      style={{
        fontSize: `${fontSize}px`,
        height: viewHeight,
        position: "relative",
      }}
    />
  )
}

export default Editor
