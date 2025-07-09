import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextApiRequest, NextApiResponse } from 'next'
import { validateInput, handleApiError, requireAuth, createApiResponse } from '../../src/api/utils'
import { z } from 'zod'

// Mock NextApiRequest and NextApiResponse
const mockRequest = () => ({
  method: 'GET',
  headers: {},
  body: {},
  query: {},
  cookies: {},
}) as NextApiRequest

const mockResponse = () => {
  const res: Partial<NextApiResponse> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    end: jest.fn(),
  }
  return res as NextApiResponse
}

describe('API Utils', () => {
  describe('validateInput', () => {
    const schema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      age: z.number().min(0),
    })

    it('should validate correct input', () => {
      const input = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
      }

      const result = validateInput(schema, input)
      expect(result).toEqual(input)
    })

    it('should throw validation error for invalid input', () => {
      const input = {
        name: '',
        email: 'invalid-email',
        age: -1,
      }

      expect(() => validateInput(schema, input))
        .toThrow('Validation failed')
    })

    it('should throw validation error for missing required fields', () => {
      const input = {
        name: 'John Doe',
      }

      expect(() => validateInput(schema, input))
        .toThrow('Validation failed')
    })
  })

  describe('handleApiError', () => {
    let req: NextApiRequest
    let res: NextApiResponse

    beforeEach(() => {
      req = mockRequest()
      res = mockResponse()
    })

    it('should handle validation errors', () => {
      const error = new Error('Validation failed')
      error.name = 'ValidationError'

      handleApiError(error, req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
        },
      })
    })

    it('should handle authentication errors', () => {
      const error = new Error('Authentication required')
      error.name = 'AuthenticationError'

      handleApiError(error, req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      })
    })

    it('should handle authorization errors', () => {
      const error = new Error('Insufficient permissions')
      error.name = 'AuthorizationError'

      handleApiError(error, req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      })
    })

    it('should handle not found errors', () => {
      const error = new Error('Resource not found')
      error.name = 'NotFoundError'

      handleApiError(error, req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
        },
      })
    })

    it('should handle generic errors', () => {
      const error = new Error('Something went wrong')

      handleApiError(error, req, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error',
        },
      })
    })

    it('should include error details in development mode', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const error = new Error('Detailed error message')
      error.stack = 'Error stack trace'

      handleApiError(error, req, res)

      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error',
          details: {
            message: 'Detailed error message',
            stack: 'Error stack trace',
          },
        },
      })

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('requireAuth', () => {
    let req: NextApiRequest
    let res: NextApiResponse

    beforeEach(() => {
      req = mockRequest()
      res = mockResponse()
    })

    it('should allow authenticated user', async () => {
      req.headers.authorization = 'Bearer valid-token'

      // Mock auth service
      const mockAuthService = {
        validateSession: jest.fn().mockResolvedValue({
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
        }),
      }

      const middleware = requireAuth(mockAuthService)
      const handler = jest.fn()

      await middleware(req, res, handler)

      expect(handler).toHaveBeenCalledWith(req, res)
      expect(req.user).toBeDefined()
      expect(req.user?.id).toBe('user-1')
    })

    it('should reject unauthenticated user', async () => {
      const mockAuthService = {
        validateSession: jest.fn().mockRejectedValue(new Error('Invalid session')),
      }

      const middleware = requireAuth(mockAuthService)
      const handler = jest.fn()

      await middleware(req, res, handler)

      expect(handler).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      })
    })

    it('should handle missing authorization header', async () => {
      const mockAuthService = {
        validateSession: jest.fn(),
      }

      const middleware = requireAuth(mockAuthService)
      const handler = jest.fn()

      await middleware(req, res, handler)

      expect(handler).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(401)
      expect(mockAuthService.validateSession).not.toHaveBeenCalled()
    })

    it('should require specific roles', async () => {
      req.headers.authorization = 'Bearer valid-token'

      const mockAuthService = {
        validateSession: jest.fn().mockResolvedValue({
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
        }),
      }

      const middleware = requireAuth(mockAuthService, ['admin'])
      const handler = jest.fn()

      await middleware(req, res, handler)

      expect(handler).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      })
    })

    it('should allow user with required role', async () => {
      req.headers.authorization = 'Bearer valid-token'

      const mockAuthService = {
        validateSession: jest.fn().mockResolvedValue({
          id: 'user-1',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin',
        }),
      }

      const middleware = requireAuth(mockAuthService, ['admin'])
      const handler = jest.fn()

      await middleware(req, res, handler)

      expect(handler).toHaveBeenCalledWith(req, res)
      expect(req.user?.role).toBe('admin')
    })
  })

  describe('createApiResponse', () => {
    let res: NextApiResponse

    beforeEach(() => {
      res = mockResponse()
    })

    it('should create successful response', () => {
      const data = { message: 'Success' }
      
      createApiResponse(res, data)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(data)
    })

    it('should create response with custom status', () => {
      const data = { id: 'user-1', name: 'Test User' }
      
      createApiResponse(res, data, 201)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(data)
    })

    it('should create response with headers', () => {
      const data = { message: 'Success' }
      const headers = { 'X-Custom-Header': 'value' }
      
      createApiResponse(res, data, 200, headers)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.setHeader).toHaveBeenCalledWith('X-Custom-Header', 'value')
      expect(res.json).toHaveBeenCalledWith(data)
    })

    it('should create paginated response', () => {
      const data = [{ id: 1 }, { id: 2 }]
      const pagination = { page: 1, limit: 10, total: 2 }
      
      createApiResponse(res, data, 200, {}, pagination)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        data,
        pagination,
      })
    })

    it('should set default headers', () => {
      const data = { message: 'Success' }
      
      createApiResponse(res, data)

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json')
      expect(res.setHeader).toHaveBeenCalledWith('X-Powered-By', 'FreedomPress')
    })
  })
})