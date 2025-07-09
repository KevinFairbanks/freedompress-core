export interface ModuleConfig {
  name: string
  version: string
  description?: string
  author?: string
  dependencies?: Record<string, string>
  requires?: {
    core?: string
    modules?: Record<string, string>
  }
}

export interface ModuleExports {
  models?: Record<string, any>
  api?: Record<string, any>
  pages?: Record<string, any>
  components?: Record<string, any>
  hooks?: Record<string, any>
  utils?: Record<string, any>
  services?: Record<string, any>
}

export interface ModuleContext {
  prisma: any
  config: any
  events: ModuleEventEmitter
  services: ModuleServiceRegistry
}

export interface ModuleInterface {
  config: ModuleConfig
  exports: ModuleExports
  
  // Lifecycle methods
  install?: (context: ModuleContext) => Promise<void>
  activate?: (context: ModuleContext) => Promise<void>
  deactivate?: (context: ModuleContext) => Promise<void>
  uninstall?: (context: ModuleContext) => Promise<void>
  
  // Configuration
  getDefaultConfig?: () => Record<string, any>
  validateConfig?: (config: Record<string, any>) => boolean
}

export interface ModuleEventEmitter {
  on: (event: string, listener: (...args: any[]) => void) => this
  off: (event: string, listener: (...args: any[]) => void) => this
  emit: (event: string, ...args: any[]) => boolean
}

export interface ModuleServiceRegistry {
  register: (name: string, service: any) => void
  get: (name: string) => any
  has: (name: string) => boolean
  remove: (name: string) => void
}

export interface ModuleRegistry {
  modules: Map<string, ModuleInterface>
  
  register: (module: ModuleInterface) => Promise<void>
  unregister: (name: string) => Promise<void>
  get: (name: string) => ModuleInterface | undefined
  list: () => ModuleInterface[]
  isActive: (name: string) => Promise<boolean>
  
  activate: (name: string) => Promise<void>
  deactivate: (name: string) => Promise<void>
}