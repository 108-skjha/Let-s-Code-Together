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
import { LanguageName, loadLanguage } from "@uiw/codemirror-extensions-langs"

import CodeMirror, {
  Extension,
  ViewUpdate,
  scrollPastEnd,
} from "@uiw/react-codemirror"

import { EditorView } from "@codemirror/view"
import { useEffect, useMemo, useState, useRef, useCallback } from "react"
import toast from "react-hot-toast"

import {
  collaborativeHighlighting,
  updateRemoteUsers,
} from "./collaborativeHighlighting"

/* =====================================================
   LANGUAGE NORMALIZER (PISTON → CODEMIRROR)
===================================================== */
const normalizeLanguage = (lang: string): LanguageName | null => {
  const map: Record<string, LanguageName> = {
    // Common
    javascript: "javascript",
    js: "javascript",
    typescript: "typescript",
    ts: "typescript",

    python: "python",
    py: "python",

    c: "c",
    "c language": "c",

    "c++": "cpp",
    cpp: "cpp",

    java: "java",
    kotlin: "kotlin",

    go: "go",
    rust: "rust",
    ruby: "ruby",
    php: "php",
    swift: "swift",
    dart: "dart",

    csharp: "csharp",
    "c#": "csharp",

    scala: "scala",
    haskell: "haskell",
    lua: "lua",
    perl: "perl",
    bash: "shell",
    powershell: "powershell",

    sql: "sql",
    sqlite3: "sql",

    r: "r",
    julia: "julia",

    // Fallbacks
    plaintext: "markdown",
    text: "markdown",
  }

  return map[lang.toLowerCase()] ?? null
}

function Editor() {
  const { users, currentUser } = useAppContext()
  const { activeFile, setActiveFile } = useFileSystem()
  const { theme, language, fontSize } = useSettings()
  const { socket } = useSocket()
  const { viewHeight } = useResponsive()

  const editorRef = useRef<any>(null)
  const [extensions, setExtensions] = useState<Extension[]>([])
  const [timeOut, setTimeOut] = useState(setTimeout(() => {}, 0))

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
    const cursorPosition = selection?.head || 0

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
    const baseExtensions: Extension[] = [
      color,
      hyperLink,
      collaborativeHighlighting(),
      scrollPastEnd(),
    ]

    const normalizedLang = normalizeLanguage(language)
    const langExt = normalizedLang ? loadLanguage(normalizedLang) : null

    if (langExt) {
      baseExtensions.push(langExt)
    } else {
      console.warn(`No syntax support for language: ${language}`)
    }

    setExtensions(baseExtensions)
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
