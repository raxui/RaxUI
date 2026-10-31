"use client"

// Ported from boot-ui. Built-in SVG paths from Lucide (ISC).
import * as React from "react"
import { useRaxTheme, raxThemeAttributes } from "@/lib/theme"
import { Slot } from "@radix-ui/react-slot"
import { horizontalListSortingStrategy, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { cn } from "@/lib/utils"
import { useKanban } from "./kanban-context"

export const KanbanBoardContext = React.createContext(false)

export interface KanbanBoardProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean
}

export const KanbanBoard = React.forwardRef<HTMLDivElement, KanbanBoardProps>(({ asChild, className, ...props }, ref) => {
  const theme = useRaxTheme()
  const context = useKanban("KanbanBoard")
  const Comp = asChild ? Slot : "div"
  return (
    <KanbanBoardContext.Provider value={true}>
      <SortableContext
        items={Object.keys(context.columns)}
        strategy={context.orientation === "horizontal" ? horizontalListSortingStrategy : verticalListSortingStrategy}
      >
        <Comp {...raxThemeAttributes(theme)} dir={undefined}
          ref={ref}
          data-orientation={context.orientation}
          data-dragging={context.activeId !== null ? "" : undefined}
          className={cn("rax-kanban", className)}
          {...props}
        />
      </SortableContext>
    </KanbanBoardContext.Provider>
  )
})

KanbanBoard.displayName = "KanbanBoard"
