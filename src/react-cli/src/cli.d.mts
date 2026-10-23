export interface Writer {
  write(text: string): unknown
}

export const VERSION: string
export const USAGE: string
export function run(args: string[], io: { cwd: string; stdout: Writer; stderr: Writer }): number
