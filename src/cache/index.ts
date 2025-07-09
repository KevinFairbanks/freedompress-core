import { createClient } from 'redis'

export interface CacheConfig {
  type: 'memory' | 'redis'
  ttl: number
  redis?: {
    url: string
    password?: string
  }
}

export interface CacheAdapter {
  get(key: string): Promise<any>
  set(key: string, value: any, ttl?: number): Promise<void>
  del(key: string): Promise<void>
  clear(): Promise<void>
  keys(pattern?: string): Promise<string[]>
}

class MemoryCache implements CacheAdapter {
  private cache = new Map<string, { value: any; expires: number }>()
  private defaultTTL: number

  constructor(defaultTTL: number = 3600) {
    this.defaultTTL = defaultTTL
    
    // Cleanup expired entries every minute
    setInterval(() => {
      this.cleanup()
    }, 60000)
  }

  async get(key: string): Promise<any> {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key)
      return null
    }
    
    return entry.value
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const expires = Date.now() + (ttl || this.defaultTTL) * 1000
    this.cache.set(key, { value, expires })
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key)
  }

  async clear(): Promise<void> {
    this.cache.clear()
  }

  async keys(pattern?: string): Promise<string[]> {
    const keys = Array.from(this.cache.keys())
    if (!pattern) return keys
    
    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    return keys.filter(key => regex.test(key))
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key)
      }
    }
  }
}

class RedisCache implements CacheAdapter {
  private client: any
  private defaultTTL: number

  constructor(config: CacheConfig['redis'], defaultTTL: number = 3600) {
    this.defaultTTL = defaultTTL
    this.client = createClient({
      url: config?.url || 'redis://localhost:6379',
      password: config?.password
    })
    
    this.client.on('error', (err: any) => {
      console.error('Redis Cache Error:', err)
    })
  }

  async connect() {
    if (!this.client.isOpen) {
      await this.client.connect()
    }
  }

  async get(key: string): Promise<any> {
    await this.connect()
    const value = await this.client.get(key)
    return value ? JSON.parse(value) : null
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    await this.connect()
    const serialized = JSON.stringify(value)
    const expireTime = ttl || this.defaultTTL
    await this.client.setEx(key, expireTime, serialized)
  }

  async del(key: string): Promise<void> {
    await this.connect()
    await this.client.del(key)
  }

  async clear(): Promise<void> {
    await this.connect()
    await this.client.flushAll()
  }

  async keys(pattern?: string): Promise<string[]> {
    await this.connect()
    return await this.client.keys(pattern || '*')
  }
}

export class CacheManager {
  private adapter: CacheAdapter
  private config: CacheConfig

  constructor(config: CacheConfig) {
    this.config = config
    
    if (config.type === 'redis') {
      this.adapter = new RedisCache(config.redis, config.ttl)
    } else {
      this.adapter = new MemoryCache(config.ttl)
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    return await this.adapter.get(key)
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    return await this.adapter.set(key, value, ttl)
  }

  async del(key: string): Promise<void> {
    return await this.adapter.del(key)
  }

  async clear(): Promise<void> {
    return await this.adapter.clear()
  }

  async keys(pattern?: string): Promise<string[]> {
    return await this.adapter.keys(pattern)
  }

  // Helper methods for common patterns
  async remember<T>(key: string, callback: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const value = await callback()
    await this.set(key, value, ttl)
    return value
  }

  async forget(key: string): Promise<void> {
    await this.del(key)
  }

  async flush(): Promise<void> {
    await this.clear()
  }

  // Tag-based cache invalidation
  async tags(tags: string[]): Promise<TaggedCache> {
    return new TaggedCache(this.adapter, tags)
  }
}

class TaggedCache {
  constructor(private adapter: CacheAdapter, private tags: string[]) {}

  async get<T = any>(key: string): Promise<T | null> {
    return await this.adapter.get(this.taggedKey(key))
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const taggedKey = this.taggedKey(key)
    await this.adapter.set(taggedKey, value, ttl)
    
    // Store reverse mapping for invalidation
    for (const tag of this.tags) {
      const tagKeys = await this.adapter.get(`tag:${tag}`) || []
      if (!tagKeys.includes(taggedKey)) {
        tagKeys.push(taggedKey)
        await this.adapter.set(`tag:${tag}`, tagKeys)
      }
    }
  }

  async flush(): Promise<void> {
    for (const tag of this.tags) {
      const tagKeys = await this.adapter.get(`tag:${tag}`) || []
      for (const key of tagKeys) {
        await this.adapter.del(key)
      }
      await this.adapter.del(`tag:${tag}`)
    }
  }

  private taggedKey(key: string): string {
    return `${this.tags.join(':')}-${key}`
  }
}

// Global cache instance
let cacheInstance: CacheManager | null = null

export function createCache(config: CacheConfig): CacheManager {
  cacheInstance = new CacheManager(config)
  return cacheInstance
}

export function getCache(): CacheManager {
  if (!cacheInstance) {
    throw new Error('Cache not initialized. Call createCache() first.')
  }
  return cacheInstance
}

// Cache middleware for API routes
export function cacheMiddleware(ttl: number = 3600) {
  return async (req: any, res: any, next: any) => {
    if (req.method !== 'GET') {
      return next()
    }

    const cache = getCache()
    const key = `api:${req.url}`
    
    try {
      const cached = await cache.get(key)
      if (cached) {
        return res.json(cached)
      }

      // Store original json method
      const originalJson = res.json
      res.json = function(data: any) {
        // Cache the response
        cache.set(key, data, ttl).catch(console.error)
        return originalJson.call(this, data)
      }

      next()
    } catch (error) {
      console.error('Cache middleware error:', error)
      next()
    }
  }
}