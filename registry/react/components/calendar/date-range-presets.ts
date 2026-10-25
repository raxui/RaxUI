import { addDays, addMonths, startOfDay, startOfMonth, type DateRange } from "./calendar"

export interface DateRangePreset { label: string; range: () => DateRange }

export const defaultRangePresets: DateRangePreset[] = [
  { label: "Today", range: () => ({ from: startOfDay(new Date()), to: startOfDay(new Date()) }) },
  { label: "Yesterday", range: () => ({ from: addDays(startOfDay(new Date()), -1), to: addDays(startOfDay(new Date()), -1) }) },
  { label: "Last 7 days", range: () => ({ from: addDays(startOfDay(new Date()), -6), to: startOfDay(new Date()) }) },
  { label: "Last 30 days", range: () => ({ from: addDays(startOfDay(new Date()), -29), to: startOfDay(new Date()) }) },
  { label: "This month", range: () => ({ from: startOfMonth(new Date()), to: startOfDay(new Date()) }) },
  { label: "Last month", range: () => ({ from: startOfMonth(addMonths(new Date(), -1)), to: addDays(startOfMonth(new Date()), -1) }) },
]
