import { hashPassword, verifyPassword, validateEmail } from '../security'

describe('Security Utils', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'TestPassword123!'
      const hash = await hashPassword(password)
      
      expect(hash).toBeDefined()
      expect(hash).not.toBe(password)
      expect(hash.length).toBeGreaterThan(50)
    })

    it('should throw error for short password', async () => {
      const shortPassword = '123'
      
      await expect(hashPassword(shortPassword)).rejects.toThrow('Password must be at least 8 characters')
    })
  })

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'TestPassword123!'
      const hash = await hashPassword(password)
      
      const isValid = await verifyPassword(password, hash)
      expect(isValid).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123!'
      const wrongPassword = 'WrongPassword123!'
      const hash = await hashPassword(password)
      
      const isValid = await verifyPassword(wrongPassword, hash)
      expect(isValid).toBe(false)
    })
  })

  describe('validateEmail', () => {
    it('should validate correct email', () => {
      const validEmail = 'test@example.com'
      const isValid = validateEmail(validEmail)
      expect(isValid).toBe(true)
    })

    it('should reject invalid email', () => {
      const invalidEmail = 'invalid-email'
      const isValid = validateEmail(invalidEmail)
      expect(isValid).toBe(false)
    })
  })
})