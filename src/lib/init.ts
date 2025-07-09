import { validateEnvironment } from './security'

/**
 * Initialize the application with security checks
 */
export function initializeApp(): void {
  try {
    // Validate environment variables
    validateEnvironment()
    
    console.log('✅ Security validation passed')
    
    // Log security warnings for development
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  Development mode - ensure production environment variables are set before deployment')
      
      if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET === 'generate-a-secure-secret-here-minimum-32-characters') {
        console.error('🚨 NEXTAUTH_SECRET is not set or using default value')
      }
    }
    
    // Production security checks
    if (process.env.NODE_ENV === 'production') {
      const productionChecks = [
        { check: process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length >= 32, error: 'NEXTAUTH_SECRET must be at least 32 characters' },
        { check: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('file:'), error: 'Production should use PostgreSQL, not SQLite' },
        { check: process.env.NEXTAUTH_URL && process.env.NEXTAUTH_URL.startsWith('https://'), error: 'NEXTAUTH_URL must use HTTPS in production' }
      ]
      
      for (const { check, error } of productionChecks) {
        if (!check) {
          throw new Error(`Production security check failed: ${error}`)
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Application initialization failed:', error)
    process.exit(1)
  }
}

/**
 * Get security status for display
 */
export function getSecurityStatus() {
  const status = {
    environment: process.env.NODE_ENV || 'development',
    database: process.env.DATABASE_URL ? 'configured' : 'not configured',
    auth: process.env.NEXTAUTH_SECRET ? 'configured' : 'not configured',
    rateLimit: process.env.RATE_LIMIT_ENABLED !== 'false' ? 'enabled' : 'disabled',
    https: process.env.NEXTAUTH_URL?.startsWith('https://') ? 'enabled' : 'disabled'
  }
  
  return status
}