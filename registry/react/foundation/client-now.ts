"use client"

import { useEffect, useState } from "react"

const prerenderDate = new Date(2000, 0, 1)

/** Read wall time after hydration so static Next.js prerenders stay deterministic. */
export function useClientNow() {
  const [now, setNow] = useState(prerenderDate)
  useEffect(() => setNow(new Date()), [])
  return now
}
