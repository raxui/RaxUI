"use client"

import * as React from "react"

import type { ToastActionElement, ToastVariant, ToastTone } from "@/components/ui/toast"

/** Toasts visible at once; older ones are dismissed (with their exit animation). */
const TOAST_LIMIT = 3
/** How long a closed toast stays mounted so its exit animation can finish. */
const TOAST_REMOVE_DELAY = 1000
export const TOAST_DEFAULT_DURATION = 5000

export interface ToastOptions {
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
  /** Replaces the variant icon — an avatar, app logo, etc. */
  icon?: React.ReactNode
  variant?: ToastVariant
  tone?: ToastTone
  /** Milliseconds before auto-close. Loading toasts default to `Infinity`. */
  duration?: number
}

export interface ToasterToast extends ToastOptions {
  id: string
  open: boolean
}

export interface ToastHandle {
  id: string
  update: (options: ToastOptions) => void
  dismiss: () => void
}

// ---- A tiny external store (no context needed, callable from anywhere) ------
let toasts: ToasterToast[] = []
let count = 0
const listeners = new Set<() => void>()
const removeTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

function setToasts(next: ToasterToast[]) {
  toasts = next
  listeners.forEach((listener) => listener())
}

function scheduleRemoval(id: string) {
  if (removeTimeouts.has(id)) return
  removeTimeouts.set(
    id,
    setTimeout(() => {
      removeTimeouts.delete(id)
      setToasts(toasts.filter((toast) => toast.id !== id))
    }, TOAST_REMOVE_DELAY),
  )
}

function dismiss(id?: string) {
  setToasts(toasts.map((toast) => (id === undefined || toast.id === id ? { ...toast, open: false } : toast)))
  toasts.filter((toast) => !toast.open).forEach((toast) => scheduleRemoval(toast.id))
}

function update(id: string, options: ToastOptions) {
  setToasts(toasts.map((toast) => (toast.id === id ? { ...toast, ...options } : toast)))
}

function toast(options: ToastOptions): ToastHandle {
  if (typeof window === "undefined") throw new Error("toast() requires a browser")
  const id = String(++count)
  setToasts([...toasts, { ...options, id, open: true }])

  const open = toasts.filter((t) => t.open)
  open.slice(0, Math.max(0, open.length - TOAST_LIMIT)).forEach((t) => dismiss(t.id))

  return { id, update: (next) => update(id, next), dismiss: () => dismiss(id) }
}

type Shortcut = (title: React.ReactNode, options?: Omit<ToastOptions, "title" | "variant">) => ToastHandle
const withVariant =
  (variant: ToastVariant): Shortcut =>
  (title, options) =>
    toast({ ...options, title, variant })

type Message<T> = React.ReactNode | ((value: T) => React.ReactNode)
const resolve = <T>(message: Message<T>, value: T) =>
  typeof message === "function" ? (message as (value: T) => React.ReactNode)(value) : message

/**
 * Shows a loading toast that turns into success or error when `promise` settles.
 * Returns the original promise so callers can keep chaining.
 */
function promise<T>(
  promise: Promise<T>,
  messages: { loading: React.ReactNode; success: Message<T>; error: Message<unknown>; description?: React.ReactNode },
) {
  const handle = toast({ variant: "loading", title: messages.loading, description: messages.description })
  promise.then(
    (value) => handle.update({ variant: "success", title: resolve(messages.success, value), description: undefined }),
    (error) => handle.update({ variant: "destructive", title: resolve(messages.error, error), description: undefined }),
  )
  return promise
}

const toastApi = Object.assign(toast, {
  success: withVariant("success"),
  error: withVariant("destructive"),
  warning: withVariant("warning"),
  info: withVariant("info"),
  loading: withVariant("loading"),
  promise,
  dismiss,
})

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const serverSnapshot: ToasterToast[] = []
function useToast() {
  const current = React.useSyncExternalStore(
    subscribe,
    () => toasts,
    () => serverSnapshot,
  )
  return { toasts: current, toast: toastApi, dismiss }
}

export { useToast, toastApi as toast }
