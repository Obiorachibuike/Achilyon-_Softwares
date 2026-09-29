import type { ApiResponse } from '@/types'

/** Browser-side API client. Only ever calls same-origin /api routes. */

export class ApiClientError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly details?: unknown) {
    super(message)
    this.name = 'ApiClientError'
  }
}

export interface ApiResult<T> {
  data: T
  meta?: Record<string, unknown>
}

export async function apiRequest<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<ApiResult<T>> {
  const { json, ...rest } = init ?? {}
  let res: Response
  try {
    res = await fetch(path, {
      ...rest,
      credentials: 'same-origin',
      headers: { accept: 'application/json', ...(json !== undefined ? { 'content-type': 'application/json' } : {}), ...rest.headers },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    })
  } catch {
    throw new ApiClientError(0, 'NETWORK_ERROR', 'Network unavailable — check your connection')
  }
  let body: ApiResponse<T>
  try {
    body = (await res.json()) as ApiResponse<T>
  } catch {
    throw new ApiClientError(res.status, 'BAD_RESPONSE', `Unexpected response (${res.status})`)
  }
  if (!body.ok) throw new ApiClientError(res.status, body.error.code, body.error.message, body.error.details)
  return { data: body.data, meta: body.meta }
}

export const api = {
  get: async <T>(path: string) => (await apiRequest<T>(path)).data,
  post: async <T>(path: string, json?: unknown) => (await apiRequest<T>(path, { method: 'POST', json: json ?? {} })).data,
  del: async <T>(path: string) => (await apiRequest<T>(path, { method: 'DELETE' })).data,
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiClientError || e instanceof Error) return e.message
  return 'Something went wrong'
}
