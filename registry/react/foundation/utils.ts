import { clsx, type ClassValue } from "clsx"

/**
 * Merge class names. Bootstrap classes do not conflict the way Tailwind
 * utilities do, so plain `clsx` is all we need — no tailwind-merge.
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}
