import type { NextRequest } from 'next/server'
import { guard, ok, route } from '@/lib/api/http'

/** GET /api/auth/session — the current session (or null). */
export const GET = route(async (req: NextRequest) => ok(await guard(req)))
