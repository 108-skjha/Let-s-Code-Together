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
import * as langs from "@uiw/codemirror-extensions-langs"

import CodeMirror, {
  Extension,
  ViewUpdate,
  scrollPastEnd,
} from "@uiw/react-codemirror"

import { useEffect, useMemo, useRef, useState } from "react"

import {
  collaborativeHighlighting,
  updateRemoteUsers,
} from "./collaborativeHighlighting"

/* =====================================================
   LANGUAGE MAP (PISTON / USER → CODEMIRROR)
   ⚠️ NO LanguageName TYPE (avoids TS2322 on Vercel)
===================================================== */
const LANGUAGE_MAP: Record<string, string> = {
  // JS / TS
  javascript: "javascript",
  js: "javascript",
  typescript: "typescript",
  ts: "typescript",

  // Python
  python: "python",
  py: "python",

  // C / C++
  c: "c",
  "c language": "c",
  cpp: "cpp",
  "c++": "cpp",

  // JVM
  java: "java",
  kotlin: "kotlin",
  scala: "scala",

  // Others
  go: "go",
  rust: "rust",
  ruby: "ruby",
  php: "php",
  swift: "swift",
  dart: "dart",

  // C#
  csharp: "csharp",
  "c#": "csharp",

  // Scripting
  bash: "shell",
  shell: "shell",
  powershell: "powershell",
  perl: "perl",
  lua: "lua",

  // Data
  sql: "sql",
  sqlite: "sql",
  sqlite3: "sql",

  // Scientific
  r: "r",
  julia: "julia",

  // Fallback
  text: "markdown",
  plaintext: "markdown",
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

    const selection = view.state?.selection?.main
    const cursorPosition = selection?.head ?? 0

    socket.emit(SocketEvent.TYPING_START, { cursorPosition })
    socket.emit(SocketEvent.FILE_UPDATED, {
      fileId: activeFile.id,
      newContent: code,
    })

    if (timeOut) clearTimeout(timeOut)
    const newTimeout = setTimeout(
      () => socket.emit(SocketEvent.TYPING_PAUSE),
      800,
    )
    setTimeOut(newTimeout)
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

    const key =
      LANGUAGE_MAP[language.toLowerCase()] || language.toLowerCase()

    // 🔥 Runtime-safe lookup (NO TypeScript union error)
    const loader = (langs as any)[key]

    if (typeof loader === "function") {
      base.push(loader())
    }

    setExtensions(base)
  }, [language, filteredUsers])

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
