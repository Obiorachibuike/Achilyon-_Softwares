import type { CompiledContract } from './compile.mjs'
export declare const PUBLISHED: string[]
export declare function renderAbiModule(contracts: Record<string, CompiledContract>, version: string): string
export declare function renderArtifact(name: string, c: CompiledContract, version: string): string
