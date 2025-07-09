import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { 
  getSecurityHeaders, 
  sanitizeInput, 
  createAuditLog,
  getClientIP,
  apiRateLimit 
} from './security'
import Joi from 'joi'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface AuthenticatedApiRequest extends NextApiRequest {
  user?: {
    id: string
    email: string
    name?: string
    role: string
  }
}

export type ApiHandler<T = any> = (
  req: AuthenticatedApiRequest,
  res: NextApiResponse<ApiResponse<T>>
) => Promise<void> | void

export function createApiHandler<T = any>(
  handler: ApiHandler<T>,
  options?: {
    requireAuth?: boolean
    allowedMethods?: string[]
    allowedRoles?: string[]
    rateLimit?: boolean
    validate?: Joi.ObjectSchema
  }
): ApiHandler<T> {
  return async (req: AuthenticatedApiRequest, res: NextApiResponse<ApiResponse<T>>) => {
    try {
      // Set security headers
      const securityHeaders = getSecurityHeaders()
      Object.entries(securityHeaders).forEach(([key, value]) => {
        res.setHeader(key, value)
      })

      // Rate limiting
      if (options?.rateLimit !== false) {
        await new Promise((resolve, reject) => {
          apiRateLimit(req as any, res as any, (err: any) => {
            if (err) reject(err)
            else resolve(undefined)
          })
        })
      }

      // Method validation
      if (options?.allowedMethods && !options.allowedMethods.includes(req.method!)) {
        await createAuditLog(req.user?.id || null, 'API_ERROR', req.url || 'unknown', {
          error: 'method_not_allowed',
          method: req.method,
          allowed: options.allowedMethods
        }, req, false)
        
        return res.status(405).json({
          success: false,
          error: `Method ${req.method} not allowed`
        })
      }

      // Authentication check
      if (options?.requireAuth) {
        const session = await getServerSession(req, res, authOptions)
        
        if (!session?.user) {
          await createAuditLog(null, 'API_ERROR', req.url || 'unknown', {
            error: 'authentication_required',
            ip: getClientIP(req)
          }, req, false)
          
          return res.status(401).json({
            success: false,
            error: 'Authentication required'
          })
        }

        req.user = session.user as any
      }

      // Role validation
      if (options?.allowedRoles && req.user) {
        if (!options.allowedRoles.includes(req.user.role)) {
          await createAuditLog(req.user.id, 'API_ERROR', req.url || 'unknown', {
            error: 'insufficient_permissions',
            required_roles: options.allowedRoles,
            user_role: req.user.role
          }, req, false)
          
          return res.status(403).json({
            success: false,
            error: 'Insufficient permissions'
          })
        }
      }

      // Input validation
      if (options?.validate && req.body) {
        const { error } = options.validate.validate(req.body)
        if (error) {
          await createAuditLog(req.user?.id || null, 'API_ERROR', req.url || 'unknown', {
            error: 'validation_failed',
            details: error.details
          }, req, false)
          
          return res.status(400).json({
            success: false,
            error: 'Invalid request data',
            data: error.details as any
          })
        }
      }

      // Sanitize string inputs
      if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObjectInputs(req.body)
      }
      
      await handler(req, res)
      
      // Log successful API call
      await createAuditLog(req.user?.id || null, 'API_SUCCESS', req.url || 'unknown', {
        method: req.method
      }, req, true)
      
    } catch (error) {
      console.error('API Error:', error)
      
      await createAuditLog(req.user?.id || null, 'API_ERROR', req.url || 'unknown', {
        error: 'internal_server_error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, req, false)
      
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        })
      }
    }
  }
}

function sanitizeObjectInputs(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj
  
  const sanitized: any = Array.isArray(obj) ? [] : {}
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value)
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObjectInputs(value)
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized
}

export function validateRequired(data: any, fields: string[]): string[] {
  const errors: string[] = []
  
  for (const field of fields) {
    if (!data[field]) {
      errors.push(`${field} is required`)
    }
  }
  
  return errors
}

export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message
  }
}

export function errorResponse(error: string, data?: any): ApiResponse {
  return {
    success: false,
    error,
    data
  }
}

export async function withPagination<T>(
  query: any,
  page: number = 1,
  limit: number = 10
): Promise<{
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}> {
  // Security limits
  const maxLimit = 100
  const maxPage = 10000
  
  // Validate and sanitize inputs
  const safePage = Math.max(1, Math.min(page, maxPage))
  const safeLimit = Math.max(1, Math.min(limit, maxLimit))
  
  const skip = (safePage - 1) * safeLimit
  const take = safeLimit

  const [data, total] = await Promise.all([
    query.skip(skip).take(take),
    query.count ? query.count() : 0
  ])

  const totalPages = Math.ceil(total / safeLimit)

  return {
    data,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
      hasNext: safePage < totalPages,
      hasPrev: safePage > 1
    }
  }
}