"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { useSheenPortalContainer, useSheenTheme, sheenThemeAttributes, SheenThemeBoundary, type SheenAppearance } from "@/lib/theme"
import { cn } from "@/lib/utils"

function Popover({ appearance, dir, ...props }: React.ComponentProps<typeof PopoverPrimitive.Root> & { appearance?: SheenAppearance; dir?: "ltr" | "rtl" }) {
  const theme = useSheenTheme({ appearance, direction: dir })
  return <SheenThemeBoundary value={theme}><PopoverPrimitive.Root {...props} /></SheenThemeBoundary>
}
const PopoverTrigger = PopoverPrimitive.Trigger
const PopoverAnchor = PopoverPrimitive.Anchor
const PopoverClose = PopoverPrimitive.Close
export interface PopoverContentProps extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> { appearance?: SheenAppearance }
const PopoverContent = React.forwardRef<React.ElementRef<typeof PopoverPrimitive.Content>, PopoverContentProps>(
  ({ className, appearance, align = "start", sideOffset = 4, ...props }, ref) => {
    const theme = useSheenTheme({ appearance })
    return <PopoverPrimitive.Portal container={useSheenPortalContainer()}>
      <PopoverPrimitive.Content {...sheenThemeAttributes(theme)} {...props} ref={ref} align={align} sideOffset={sideOffset} className={cn("sheen-popover", className)} />
    </PopoverPrimitive.Portal>
  },
)
PopoverContent.displayName = "PopoverContent"
export { Popover, PopoverTrigger, PopoverAnchor, PopoverClose, PopoverContent }
