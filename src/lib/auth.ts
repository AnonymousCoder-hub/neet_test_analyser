import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key')

export interface AuthUser {
  id: string
  username: string
  role: string
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12)
  return bcrypt.hash(password, salt)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function generateSecurityToken(): Promise<string> {
  // Generate a simple secure token using crypto
  const array = new Uint8Array(8)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array)
  } else {
    for (let i = 0; i < 8; i++) array[i] = Math.floor(Math.random() * 256)
  }
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('').toUpperCase().substring(0, 16)
}

export async function createToken(user: AuthUser): Promise<string> {
  return new SignJWT({ id: user.id, username: user.username, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      id: payload.id as string,
      username: payload.username as string,
      role: payload.role as string,
    }
  } catch {
    return null
  }
}

export function getTokenFromHeaders(request: Request): string | null {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.substring(7)
}
