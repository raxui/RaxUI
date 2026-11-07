"use client"

// Ported from boot-ui. Built-in SVG paths from Lucide (ISC).
import * as React from "react"
import Markdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"
import { SparkIcon } from "./ai-shared"
import { AICodeBlock } from "./ai-code-block"

export const AIConversation = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("rax-ai-conversation", className)} role="log" aria-live="polite" {...props} />
))

AIConversation.displayName = "AIConversation"

export interface AIMessageProps extends React.HTMLAttributes<HTMLDivElement> {
  from: "user" | "assistant"
  /** Assistant avatar; defaults to a spark mark. */
  avatar?: React.ReactNode
}

export const AIMessage = React.forwardRef<HTMLDivElement, AIMessageProps>(({ from, avatar, className, children, ...props }, ref) => (
  <div ref={ref} className={cn("rax-ai-message", className)} data-from={from} {...props}>
    {from === "assistant" && (
      <div className="rax-ai-avatar" aria-hidden="true">
        {avatar ?? <SparkIcon />}
      </div>
    )}
    <div className="rax-ai-message-body" dir={from === "user" ? "auto" : undefined}>
      {children}
    </div>
  </div>
))

AIMessage.displayName = "AIMessage"

export interface AIResponseProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Shows a blinking caret after the text while it's still arriving. */
  streaming?: boolean
  /**
   * Render `children` (a string) as Markdown: headings, lists, tables, task
   * lists, quotes, links and code. No raw HTML is rendered, so model output
   * can't inject markup.
   */
  markdown?: boolean
  /** Labels for the copy button of Markdown code blocks. */
  codeLabels?: AICodeLabels
}

export type AICodeLabels = { copy?: string; copied?: string }

export const CodeLabelsContext = React.createContext<AICodeLabels>({})

export function closeOpenMarks(text: string) {
  const fences = text.split("```")
  if (fences.length % 2 === 0) return text // inside an open fence: Markdown renders it as code already
  const tail = fences[fences.length - 1]
  let closing = ""
  if ((tail.match(/`/g) ?? []).length % 2) closing += "`"
  const outsideCode = tail.replace(/`[^`]*`/g, "")
  if ((outsideCode.match(/\*\*/g) ?? []).length % 2) closing += "**"
  if ((outsideCode.match(/~~/g) ?? []).length % 2) closing += "~~"
  return text + closing
}

export const languageOf = (node: React.ReactNode) => {
  const child = React.Children.toArray(node)[0]
  const className = React.isValidElement<{ className?: string }>(child) ? child.props.className : undefined
  return className?.match(/language-([\w-]+)/)?.[1]
}

export const textOf = (node: React.ReactNode): string =>
  React.Children.toArray(node)
    .map((child) =>
      typeof child === "string" ? child : React.isValidElement<{ children?: React.ReactNode }>(child) ? textOf(child.props.children) : "",
    )
    .join("")

export const MARKDOWN_COMPONENTS: Components = {
  // Fenced code → the copyable code block.
  pre: function Pre({ children }) {
    const labels = React.useContext(CodeLabelsContext)
    return (
      <AICodeBlock
        code={textOf(children).replace(/\n$/, "")}
        language={languageOf(children)}
        copyLabel={labels.copy}
        copiedLabel={labels.copied}
      />
    )
  },
  a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
  table: ({ node: _node, ...props }) => (
    <div className="rax-ai-table rax-not-typeset">
      <table className="table table-sm" {...props} />
    </div>
  ),
}

export const AIMarkdown = ({ children, streaming, codeLabels = {} }: { children: string; streaming?: boolean; codeLabels?: AICodeLabels }) => (
  <CodeLabelsContext.Provider value={codeLabels}>
    <Markdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
      {streaming ? closeOpenMarks(children) : children}
    </Markdown>
  </CodeLabelsContext.Provider>
)

export const AIResponse = React.forwardRef<HTMLDivElement, AIResponseProps>(
  ({ streaming, markdown, codeLabels, className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rax-ai-response", markdown && "rax-typeset", className)}
      data-streaming={streaming ? "" : undefined}
      data-markdown={markdown ? "" : undefined}
      dir="auto"
      aria-busy={streaming || undefined}
      {...props}
    >
      {markdown && typeof children === "string" ? (
        <AIMarkdown streaming={streaming} codeLabels={codeLabels}>
          {children}
        </AIMarkdown>
      ) : (
        children
      )}
    </div>
  ),
)

AIResponse.displayName = "AIResponse"

export const AIShimmer = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn("rax-ai-shimmer", className)} {...props} />
)
