export declare const ROOT: string
export declare const SRC: string
export declare const SETTINGS: Record<string, unknown>
export interface CompiledContract {
  abi: readonly unknown[]
  bytecode: `0x${string}`
  deployedSize: number
  source: string
}
export declare function compile(opts?: { includeTests?: boolean }): { version: string; contracts: Record<string, CompiledContract> }
