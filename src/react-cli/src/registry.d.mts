export interface ManifestFile {
  source: string
  target: string
  type: "tsx" | "ts" | "scss"
  sha256: string
}

export interface Manifest {
  schemaVersion: number
  name: string
  version: string
  description?: string
  requires?: string[]
  packages?: Record<string, string>
  styles?: string[]
  files: ManifestFile[]
  manifestSha256: string
}

export interface RegistryIndex {
  schemaVersion: number
  name: string
  items: { name: string; manifest: string }[]
}

export const SCHEMA_VERSION: number
export function sha256(bytes: Uint8Array): string
export function assertSafeRelative(value: string, label: string): void
export function readSource(root: string, source: string): Buffer
export function loadIndex(root: string): RegistryIndex
export function loadManifest(root: string, name: string): Manifest
export function validateManifest(root: string, manifest: Omit<Manifest, "manifestSha256">, index?: RegistryIndex): void
export function resolveItems(root: string, name: string): Manifest[]
