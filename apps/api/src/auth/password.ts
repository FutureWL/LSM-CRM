import { hash, verify } from '@node-rs/argon2'

// Argon2id = 2 (matches @node-rs/argon2's Algorithm.Argon2id). Inlined as a literal
// because `Algorithm` is a const enum and `isolatedModules` blocks const-enum access.
//
// 参数依据 OWASP Password Storage Cheat Sheet (2024) 推荐值：
//   memoryCost: 19456 KiB (19 MiB) 最小值
//   timeCost:   2 iterations
//   parallelism: 1 thread
//   算法：Argon2id
//
// 若需进一步提升可调到 memoryCost: 65536 + timeCost: 3，但会明显拖慢登录；
// 现值在安全 / 性能间取得平衡。
const OPTS = {
  algorithm: 2 as const,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
}

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, OPTS)
}

export async function verifyPassword(stored: string, plain: string): Promise<boolean> {
  try {
    return await verify(stored, plain)
  } catch {
    return false
  }
}
