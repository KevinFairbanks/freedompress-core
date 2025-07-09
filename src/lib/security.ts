import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { NextApiRequest } from 'next'
import { prisma } from './prisma'
import rateLimit from 'express-rate-limit'
import { createHash } from 'crypto'

// Password security
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/

export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  }
  
  if (!PASSWORD_REGEX.test(password)) {
    throw new Error('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
  }
  
  const salt = await bcrypt.genSalt(12)
  return bcrypt.hash(password, salt)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Account lockout configuration
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes

export async function checkAccountLockout(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { failedAttempts: true, lockedUntil: true }
  })
  
  if (!user) return false
  
  // Check if account is currently locked
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return true
  }
  
  // Reset lockout if expired
  if (user.lockedUntil && user.lockedUntil <= new Date()) {
    await prisma.user.update({
      where: { id: userId },
      data: { failedAttempts: 0, lockedUntil: null }
    })
  }
  
  return false
}

export async function recordFailedAttempt(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { failedAttempts: true }
  })
  
  if (!user) return
  
  const newFailedAttempts = user.failedAttempts + 1
  const updateData: any = { failedAttempts: newFailedAttempts }
  
  // Lock account if max attempts reached
  if (newFailedAttempts >= MAX_LOGIN_ATTEMPTS) {
    updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION)
  }
  
  await prisma.user.update({
    where: { id: userId },
    data: updateData
  })
}

export async function recordSuccessfulLogin(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedAttempts: 0,
      lockedUntil: null,
      lastLogin: new Date()
    }
  })
}

// Rate limiting
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
})

export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many API requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
})

// Input validation and sanitization
export function sanitizeInput(input: string): string {
  if (!input) return ''
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 1000) // Limit length
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

// Security headers
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'",
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  }
}

// Audit logging
export async function createAuditLog(
  userId: string | null,
  action: string,
  resource: string,
  details?: any,
  req?: NextApiRequest,
  success: boolean = true
): Promise<void> {
  const auditData = {
    userId,
    action,
    resource,
    details: details ? JSON.stringify(details) : null,
    ipAddress: req ? getClientIP(req) : null,
    userAgent: req ? req.headers['user-agent'] : null,
    success
  }
  
  await prisma.auditLog.create({ data: auditData })
}

export function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  const ip = forwarded ? forwarded.toString().split(',')[0] : req.socket.remoteAddress
  return ip || 'unknown'
}

// Token generation for secure operations
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Configuration validation
export function validateModuleConfig(config: any): boolean {
  if (!config || typeof config !== 'object') return false
  
  // Check for dangerous keys
  const dangerousKeys = ['eval', 'Function', 'require', 'process', 'global', '__dirname', '__filename']
  const configString = JSON.stringify(config)
  
  for (const key of dangerousKeys) {
    if (configString.includes(key)) return false
  }
  
  return true
}

export function hashConfig(config: any): string {
  const configString = JSON.stringify(config, Object.keys(config).sort())
  return createHash('sha256').update(configString).digest('hex')
}

// Environment validation
export function validateEnvironment(): void {
  const requiredEnvVars = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL']
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`)
    }
  }
  
  // Validate NEXTAUTH_SECRET strength
  const secret = process.env.NEXTAUTH_SECRET
  if (secret && secret.length < 32) {
    throw new Error('NEXTAUTH_SECRET must be at least 32 characters long')
  }
  
  // Validate database URL is not default
  if (process.env.DATABASE_URL === 'file:./dev.db' && process.env.NODE_ENV === 'production') {
    throw new Error('Cannot use SQLite in production. Use PostgreSQL instead.')
  }
}