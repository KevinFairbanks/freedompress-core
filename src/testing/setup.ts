// Test setup file
import { setupTestEnvironment } from './index'

// Global test setup
setupTestEnvironment()

// Mock console methods for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}