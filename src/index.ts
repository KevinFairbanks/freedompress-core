// Core Framework Exports
export * from './lib/prisma'
export * from './lib/auth'
export * from './lib/api'
export * from './lib/security'
export * from './lib/module-system'
export * from './lib/init'
export * from './cache'
export * from './testing'

// Type Exports
export * from './types/module'

// Core Configuration Types
export interface Config {
  modules: string[]
  database: {
    type: 'sqlite' | 'postgresql'
    url?: string
  }
  security: {
    rateLimit: {
      windowMs: number
      max: number
    }
    enableAuditLog?: boolean
    csrfProtection?: boolean
  }
  cache?: {
    type: 'memory' | 'redis'
    ttl?: number
    redis?: {
      url: string
      password?: string
    }
  }
  email?: {
    provider: 'smtp' | 'sendgrid' | 'mailgun'
    config: Record<string, any>
  }
  storage?: {
    provider: 'local' | 's3' | 'gcs'
    config: Record<string, any>
  }
}

// Module Interface Re-export
export type { ModuleInterface, ModuleConfig, ModuleExports } from './types/module'

// Utility Functions
export { createApiHandler, successResponse, errorResponse } from './lib/api'
export { hashPassword, verifyPassword, validateEmail } from './lib/security'
export { moduleRegistry } from './lib/module-system'
export { getCache, createCache } from './cache'
export { setupTestEnvironment, createTestUser } from './testing'

// Framework Information
export const FRAMEWORK_VERSION = '1.0.0'
export const FRAMEWORK_NAME = 'FreedomPress'