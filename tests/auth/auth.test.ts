import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { AuthService } from '../../src/auth/AuthService'
import { UserService } from '../../src/auth/UserService'
import { PrismaClient } from '@prisma/client'

// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  session: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
} as unknown as PrismaClient

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedpassword'),
  compare: jest.fn().mockResolvedValue(true),
}))

describe('AuthService', () => {
  let authService: AuthService
  let userService: UserService

  beforeEach(() => {
    jest.clearAllMocks()
    userService = new UserService(mockPrisma)
    authService = new AuthService(mockPrisma, userService)
  })

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedpassword',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(mockUser)
      mockPrisma.session.create = jest.fn().mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        token: 'session-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })

      const result = await authService.login('test@example.com', 'password')

      expect(result).toEqual({
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
        },
        token: 'session-token',
      })
    })

    it('should fail login with invalid email', async () => {
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(null)

      await expect(authService.login('invalid@example.com', 'password'))
        .rejects.toThrow('Invalid credentials')
    })

    it('should fail login with invalid password', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashedpassword',
      }

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(mockUser)
      
      const bcrypt = require('bcrypt')
      bcrypt.compare.mockResolvedValue(false)

      await expect(authService.login('test@example.com', 'wrongpassword'))
        .rejects.toThrow('Invalid credentials')
    })
  })

  describe('register', () => {
    it('should successfully register new user', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedpassword',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(null)
      mockPrisma.user.create = jest.fn().mockResolvedValue(mockUser)

      const result = await authService.register({
        email: 'test@example.com',
        password: 'password',
        name: 'Test User',
      })

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
      })
    })

    it('should fail to register with existing email', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
      }

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(mockUser)

      await expect(authService.register({
        email: 'test@example.com',
        password: 'password',
        name: 'Test User',
      })).rejects.toThrow('User already exists')
    })
  })

  describe('validateSession', () => {
    it('should validate active session', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        token: 'session-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
        },
      }

      mockPrisma.session.findUnique = jest.fn().mockResolvedValue(mockSession)

      const result = await authService.validateSession('session-token')

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
      })
    })

    it('should reject expired session', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        token: 'session-token',
        expiresAt: new Date(Date.now() - 1000), // Expired
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
        },
      }

      mockPrisma.session.findUnique = jest.fn().mockResolvedValue(mockSession)
      mockPrisma.session.delete = jest.fn().mockResolvedValue(mockSession)

      await expect(authService.validateSession('session-token'))
        .rejects.toThrow('Session expired')
    })

    it('should reject invalid session token', async () => {
      mockPrisma.session.findUnique = jest.fn().mockResolvedValue(null)

      await expect(authService.validateSession('invalid-token'))
        .rejects.toThrow('Invalid session')
    })
  })

  describe('logout', () => {
    it('should successfully logout user', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        token: 'session-token',
      }

      mockPrisma.session.findUnique = jest.fn().mockResolvedValue(mockSession)
      mockPrisma.session.delete = jest.fn().mockResolvedValue(mockSession)

      const result = await authService.logout('session-token')

      expect(result).toBe(true)
      expect(mockPrisma.session.delete).toHaveBeenCalledWith({
        where: { token: 'session-token' },
      })
    })

    it('should handle logout with invalid token', async () => {
      mockPrisma.session.findUnique = jest.fn().mockResolvedValue(null)

      const result = await authService.logout('invalid-token')

      expect(result).toBe(false)
    })
  })
})

describe('UserService', () => {
  let userService: UserService

  beforeEach(() => {
    jest.clearAllMocks()
    userService = new UserService(mockPrisma)
  })

  describe('createUser', () => {
    it('should create user with valid data', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedpassword',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.user.create = jest.fn().mockResolvedValue(mockUser)

      const result = await userService.createUser({
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User',
      })

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
      })
    })
  })

  describe('getUserById', () => {
    it('should return user by id', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(mockUser)

      const result = await userService.getUserById('user-1')

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
      })
    })

    it('should return null for non-existent user', async () => {
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(null)

      const result = await userService.getUserById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'updated@example.com',
        name: 'Updated User',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.user.update = jest.fn().mockResolvedValue(mockUser)

      const result = await userService.updateUser('user-1', {
        email: 'updated@example.com',
        name: 'Updated User',
      })

      expect(result).toEqual({
        id: 'user-1',
        email: 'updated@example.com',
        name: 'Updated User',
        role: 'user',
      })
    })
  })

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
      }

      mockPrisma.user.delete = jest.fn().mockResolvedValue(mockUser)

      const result = await userService.deleteUser('user-1')

      expect(result).toBe(true)
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      })
    })
  })

  describe('getAllUsers', () => {
    it('should return paginated users', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'test1@example.com',
          name: 'Test User 1',
          role: 'user',
        },
        {
          id: 'user-2',
          email: 'test2@example.com',
          name: 'Test User 2',
          role: 'admin',
        },
      ]

      mockPrisma.user.findMany = jest.fn().mockResolvedValue(mockUsers)

      const result = await userService.getAllUsers({ page: 1, limit: 10 })

      expect(result).toEqual({
        users: mockUsers,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
        },
      })
    })
  })
})