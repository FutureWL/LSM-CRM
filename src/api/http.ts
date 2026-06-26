// HTTP 客户端 - fetch 封装 + 错误归一化 + 401 自动跳登录
//
// 设计要点：
// 1. 单一 request() 入口，所有 API 模块都用它
// 2. cookies 自动带（credentials: 'include'），session cookie 由浏览器管理
// 3. 后端响应统一 { ok, data, error } 格式，错误抛 ApiError
// 4. 401 自动清登录态并跳登录页（避免到处写）

import { APP_ENV } from '@/config/env'
import { useAuthStore } from '@/stores/auth'

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL'
  | 'NETWORK_ERROR'

export class ApiError extends Error {
  public readonly code: ApiErrorCode
  public readonly status: number
  public readonly details?: unknown

  constructor(code: ApiErrorCode, message: string, status: number, details?: unknown) {
    super(message)
    this.code = code
    this.status = status
    this.details = details
    this.name = 'ApiError'
  }
}

interface ApiSuccess<T> {
  ok: true
  data: T
  error: null
}
interface ApiFailure {
  ok: false
  data: null
  error: { code: string; message: string; details?: unknown }
}
type ApiResponse<T> = ApiSuccess<T> | ApiFailure

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined | null> | object
  body?: unknown
  signal?: AbortSignal
  /** 不触发 401 自动跳登录（用于登录本身 / 探活） */
  skipAuthRedirect?: boolean
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  // APP_ENV.apiBaseUrl 在 dev 模式下形如 "http://localhost:3000/api/v1"
  // 在 prod 模式下形如 "/api/v1"（同源经 nginx 反代）
  const base = APP_ENV.apiBaseUrl.replace(/\/$/, '')
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const url = `${base}${cleanPath}`
  if (!query) return url
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(query as Record<string, unknown>)) {
    if (v === undefined || v === null) continue
    params.set(k, String(v))
  }
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

async function handle401() {
  // 避免循环：仅在确实有用户时才清
  try {
    const auth = useAuthStore()
    if (auth.isLoggedIn) {
      auth.clear()
      // 跳登录页（用 hash 路由，避免在 router 之外再依赖）
      if (typeof window !== 'undefined' && window.location.hash !== '#/login') {
        window.location.href = '/#/login'
      }
    }
  } catch {
    // store 还没初始化（极早的请求），吞掉
  }
}

export async function request<T>(method: Method, path: string, opts: RequestOptions = {}): Promise<T> {
  const url = buildUrl(path, opts.query)
  const init: RequestInit = {
    method,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
    signal: opts.signal,
  }
  if (opts.body !== undefined) {
    ;(init.headers as Record<string, string>)['Content-Type'] = 'application/json'
    init.body = JSON.stringify(opts.body)
  }

  let res: Response
  try {
    res = await fetch(url, init)
  } catch (err) {
    throw new ApiError(
      'NETWORK_ERROR',
      err instanceof Error ? err.message : 'Network error',
      0,
    )
  }

  // 401 在任何路径都视作登录失效（除了明确 skip 的）
  if (res.status === 401 && !opts.skipAuthRedirect) {
    await handle401()
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as T
  }

  let payload: ApiResponse<T> | null = null
  try {
    payload = (await res.json()) as ApiResponse<T>
  } catch {
    throw new ApiError(
      'INTERNAL',
      `Non-JSON response (HTTP ${res.status})`,
      res.status,
    )
  }

  if (!payload || typeof payload !== 'object') {
    throw new ApiError('INTERNAL', 'Malformed response', res.status)
  }

  if (!payload.ok) {
    throw new ApiError(
      (payload.error?.code as ApiErrorCode) ?? 'INTERNAL',
      payload.error?.message ?? 'Request failed',
      res.status,
      payload.error?.details,
    )
  }

  return payload.data
}

// 便捷方法
export const api = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>('GET', path, opts),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>('POST', path, { ...opts, body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>('PATCH', path, { ...opts, body }),
  delete: <T>(path: string, opts?: RequestOptions) => request<T>('DELETE', path, opts),
}