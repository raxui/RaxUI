"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { useRaxPortalContainer, useRaxTheme, raxThemeAttributes, RaxThemeBoundary, type RaxAppearance } from "@/lib/theme"
import { cn } from "@/lib/utils"

function Popover({ appearance, dir, ...props }: React.ComponentProps<typeof PopoverPrimitive.Root> & { appearance?: RaxAppearance; dir?: "ltr" | "rtl" }) {
  const theme = useRaxTheme({ appearance, direction: dir })
  return <RaxThemeBoundary value={theme}><PopoverPrimitive.Root {...props} /></RaxThemeBoundary>
}
const PopoverTrigger = PopoverPrimitive.Trigger
const PopoverAnchor = PopoverPrimitive.Anchor
const PopoverClose = PopoverPrimitive.Close
export interface PopoverContentProps extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> { appearance?: RaxAppearance }
const PopoverContent = React.forwardRef<React.ElementRef<typeof PopoverPrimitive.Content>, PopoverContentProps>(
  ({ className, appearance, align = "start", sideOffset = 4, ...props }, ref) => {
    const theme = useRaxTheme({ appearance })
    return <PopoverPrimitive.Portal container={useRaxPortalContainer()}>
      <PopoverPrimitive.Content {...raxThemeAttributes(theme)} {...props} ref={ref} align={align} sideOffset={sideOffset} className={cn("rax-popover", className)} />
    </PopoverPrimitive.Portal>
  },
)
PopoverContent.displayName = "PopoverContent"
export { Popover, PopoverTrigger, PopoverAnchor, PopoverClose, PopoverContent }
