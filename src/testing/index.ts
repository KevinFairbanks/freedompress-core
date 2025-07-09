import { PrismaClient } from '@prisma/client'
import { NextApiRequest, NextApiResponse } from 'next'
import { createMocks } from 'node-mocks-http'

// Mock database client for testing
export class MockPrismaClient {
  private mockData: Map<string, any[]> = new Map()

  constructor() {
    // Initialize with empty collections
    this.mockData.set('users', [])
    this.mockData.set('posts', [])
    this.mockData.set('products', [])
    this.mockData.set('orders', [])
  }

  // Generic CRUD operations
  createMockModel(modelName: string) {
    return {
      findMany: jest.fn().mockImplementation((args?: any) => {
        const data = this.mockData.get(modelName) || []
        if (args?.where) {
          return data.filter((item: any) => this.matchesWhere(item, args.where))
        }
        return data
      }),

      findUnique: jest.fn().mockImplementation((args: any) => {
        const data = this.mockData.get(modelName) || []
        return data.find((item: any) => this.matchesWhere(item, args.where)) || null
      }),

      create: jest.fn().mockImplementation((args: any) => {
        const data = this.mockData.get(modelName) || []
        const newItem = {
          id: `mock-${Date.now()}`,
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date()
        }
        data.push(newItem)
        this.mockData.set(modelName, data)
        return newItem
      }),

      update: jest.fn().mockImplementation((args: any) => {
        const data = this.mockData.get(modelName) || []
        const index = data.findIndex((item: any) => this.matchesWhere(item, args.where))
        if (index !== -1) {
          data[index] = { ...data[index], ...args.data, updatedAt: new Date() }
          this.mockData.set(modelName, data)
          return data[index]
        }
        return null
      }),

      delete: jest.fn().mockImplementation((args: any) => {
        const data = this.mockData.get(modelName) || []
        const index = data.findIndex((item: any) => this.matchesWhere(item, args.where))
        if (index !== -1) {
          const deleted = data.splice(index, 1)[0]
          this.mockData.set(modelName, data)
          return deleted
        }
        return null
      })
    }
  }

  private matchesWhere(item: any, where: any): boolean {
    return Object.keys(where).every(key => item[key] === where[key])
  }

  // Model accessors
  get user() { return this.createMockModel('users') }
  get post() { return this.createMockModel('posts') }
  get product() { return this.createMockModel('products') }
  get order() { return this.createMockModel('orders') }

  // Utility methods
  clearAll() {
    this.mockData.clear()
    this.mockData.set('users', [])
    this.mockData.set('posts', [])
    this.mockData.set('products', [])
    this.mockData.set('orders', [])
  }

  setData(modelName: string, data: any[]) {
    this.mockData.set(modelName, data)
  }

  getData(modelName: string) {
    return this.mockData.get(modelName) || []
  }
}

// Mock API request/response helpers
export function createMockApiRequest(options: any = {}) {
  const { req } = createMocks({
    method: 'GET',
    ...options
  })
  return req as NextApiRequest
}

export function createMockApiResponse(options: Partial<NextApiResponse> = {}) {
  const { res } = createMocks({
    ...options
  })
  return res as NextApiResponse
}

// Test user factory
export function createTestUser(overrides: any = {}) {
  return {
    id: 'test-user-1',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }
}

// Test post factory
export function createTestPost(overrides: any = {}) {
  return {
    id: 'test-post-1',
    title: 'Test Post',
    content: 'This is a test post',
    published: true,
    authorId: 'test-user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }
}

// Test product factory
export function createTestProduct(overrides: any = {}) {
  return {
    id: 'test-product-1',
    name: 'Test Product',
    description: 'This is a test product',
    price: 29.99,
    stock: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }
}

// Test order factory
export function createTestOrder(overrides: any = {}) {
  return {
    id: 'test-order-1',
    total: 29.99,
    status: 'pending',
    userId: 'test-user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }
}

// Performance testing utilities
export class PerformanceTimer {
  private startTime: number = 0
  private endTime: number = 0

  start() {
    this.startTime = performance.now()
  }

  end() {
    this.endTime = performance.now()
    return this.endTime - this.startTime
  }

  getDuration() {
    return this.endTime - this.startTime
  }
}

export function measurePerformance<T>(fn: () => T | Promise<T>): Promise<{ result: T; duration: number }> {
  const timer = new PerformanceTimer()
  timer.start()
  
  const result = fn()
  
  if (result instanceof Promise) {
    return result.then(res => ({
      result: res,
      duration: timer.end()
    }))
  } else {
    return Promise.resolve({
      result,
      duration: timer.end()
    })
  }
}

// Database testing utilities
export async function withTestDatabase<T>(callback: (db: MockPrismaClient) => Promise<T>): Promise<T> {
  const mockDb = new MockPrismaClient()
  try {
    return await callback(mockDb)
  } finally {
    mockDb.clearAll()
  }
}

// Test session factory
export function createTestSession(overrides: any = {}) {
  return {
    user: createTestUser(),
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ...overrides
  }
}

// Test module context factory
export function createTestModuleContext(overrides: any = {}) {
  return {
    name: 'test-module',
    version: '1.0.0',
    config: {},
    dependencies: [],
    isActive: true,
    ...overrides
  }
}

// Test environment setup
export class TestSetup {
  static setup() {
    // Set test environment
    ;(process.env as any).NODE_ENV = 'test'
    process.env.DATABASE_URL = 'file:./test.db'
    process.env.NEXTAUTH_SECRET = 'test-secret-key-minimum-32-characters'
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
  }

  static teardown() {
    // Clean up test environment
    delete process.env.DATABASE_URL
    delete process.env.NEXTAUTH_SECRET
    delete process.env.NEXTAUTH_URL
  }
}

export function setupTestEnvironment() {
  beforeAll(() => {
    TestSetup.setup()
  })

  afterAll(() => {
    TestSetup.teardown()
  })
}