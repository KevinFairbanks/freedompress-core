import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'

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
  }
): ApiHandler<T> {
  return async (req: AuthenticatedApiRequest, res: NextApiResponse<ApiResponse<T>>) => {
    try {
      // Method validation
      if (options?.allowedMethods && !options.allowedMethods.includes(req.method!)) {
        return res.status(405).json({
          success: false,
          error: `Method ${req.method} not allowed`
        })
      }

      // Authentication check
      if (options?.requireAuth) {
        const session = await getServerSession(req, res, authOptions)
        
        if (!session?.user) {
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
          return res.status(403).json({
            success: false,
            error: 'Insufficient permissions'
          })
        }
      }

      // Rate limiting would go here
      
      await handler(req, res)
    } catch (error) {
      console.error('API Error:', error)
      
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        })
      }
    }
  }
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
  const skip = (page - 1) * limit
  const take = limit

  const [data, total] = await Promise.all([
    query.skip(skip).take(take),
    query.count ? query.count() : 0
  ])

  const totalPages = Math.ceil(total / limit)

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  }
}