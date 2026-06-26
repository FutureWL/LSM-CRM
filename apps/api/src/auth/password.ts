import { hash, verify } from '@node-rs/argon2'

// Argon2id = 2 (matches @node-rs/argon2's Algorithm.Argon2id). Inlined as a literal
// because `Algorithm` is a const enum and `isolatedModules` blocks const-enum access.
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
