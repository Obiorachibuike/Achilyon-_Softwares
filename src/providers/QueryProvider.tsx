'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { ApiClientError } from '@/lib/api/client'

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: true,
            retry: (count, error) => {
              if (error instanceof ApiClientError && [400, 401, 403, 404, 422, 501].includes(error.status)) return false
              return count < 2
            },
          },
        },
      }),
  )
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
