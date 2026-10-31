"use client"

import * as React from "react"
import { RaxThemeProvider } from "@/lib/theme"
import { FileUpload, type FileUploadContext } from "@/components/ui/file-upload"

export default function Demo() {
  const attempts = React.useRef(new WeakSet<File>())
  const [submitted, setSubmitted] = React.useState("No files")
  const upload = async (file: File, { onProgress }: FileUploadContext) => {
    onProgress(50)
    if (!attempts.current.has(file)) { attempts.current.add(file); throw new Error("Try again") }
    return { name: file.name }
  }
  return <RaxThemeProvider><form onSubmit={event => {
    event.preventDefault()
    const names = new FormData(event.currentTarget).getAll("files").filter((value): value is File => value instanceof File && value.name !== "").map(file => file.name)
    setSubmitted(names.join(", ") || "No files")
  }}>
    <FileUpload variant="dropzone" aria-label="Upload" name="files" accept=".pdf" upload={upload} />
    <button type="submit">Send</button>
    <output role="status">{submitted}</output>
  </form><div style={{ maxWidth: "40rem" }}><FileUpload variant="compact" layout="grid" aria-label="Photos" accept="image/*" /></div></RaxThemeProvider>
}
