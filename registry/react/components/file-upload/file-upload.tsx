"use client"

import * as React from "react"
import { useFieldControlProps } from "@/components/ui/field"
import { useRaxTheme, raxThemeAttributes, type RaxAppearance } from "@/lib/theme"
import { NativeFileUpload, type NativeFileUploadProps } from "./file-upload-native"
import { QueuedFileUpload, type QueuedFileUploadProps } from "./file-upload-queue"

export type FileUploadNativeProps = NativeFileUploadProps & { variant?: never }
export type FileUploadQueueProps = QueuedFileUploadProps & { variant: "dropzone" | "compact"; appearance?: RaxAppearance }
export type FileUploadProps = FileUploadNativeProps | FileUploadQueueProps
export type { FileUploadContext, FileUploadLabels, FileUploadStatus, FileUploadRejection } from "./file-upload-queue"
export { formatBytes } from "./file-upload-queue"

// An explicit variant opts into the queue; existing native-input callers keep their ref and batch semantics.
const FileUpload = React.forwardRef<HTMLInputElement | HTMLDivElement, FileUploadProps>((props, ref) => {
  const wired = useFieldControlProps({ ...props })
  const theme = useRaxTheme({ appearance: props.appearance })
  if (wired.variant) {
    const { appearance: _appearance, ...queueProps } = wired
    return <QueuedFileUpload {...queueProps} {...raxThemeAttributes(theme)} ref={ref as React.ForwardedRef<HTMLDivElement>} />
  }
  return <NativeFileUpload {...props as FileUploadNativeProps} ref={ref as React.ForwardedRef<HTMLInputElement>} />
}) as {
  (props: FileUploadNativeProps & React.RefAttributes<HTMLInputElement>): React.ReactElement | null
  (props: FileUploadQueueProps & React.RefAttributes<HTMLDivElement>): React.ReactElement | null
  displayName?: string
}
FileUpload.displayName = "FileUpload"
export { FileUpload }
