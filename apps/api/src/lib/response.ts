import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export interface ApiSuccess<T> {
  ok: true
  data: T
  error: null
}

export interface ApiFailure {
  ok: false
  data: null
  error: { code: string; message: string; details?: unknown }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure

export function ok<T>(c: Context, data: T, status: ContentfulStatusCode = 200) {
  return c.json<ApiSuccess<T>>({ ok: true, data, error: null }, status)
}

export function fail(
  c: Context,
  code: string,
  message: string,
  status: ContentfulStatusCode = 500,
  details?: unknown,
) {
  const body: ApiFailure = { ok: false, data: null, error: { code, message, details } }
  return c.json(body, status)
}
