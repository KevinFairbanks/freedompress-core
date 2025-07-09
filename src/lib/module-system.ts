import { EventEmitter } from 'events'
import { prisma } from './prisma'
import { 
  ModuleInterface, 
  ModuleRegistry, 
  ModuleContext, 
  ModuleEventEmitter, 
  ModuleServiceRegistry 
} from '@/types/module'

class ModuleEventEmitterImpl extends EventEmitter implements ModuleEventEmitter {
  on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener)
  }
  
  off(event: string, listener: (...args: any[]) => void): this {
    return super.off(event, listener)
  }
  
  emit(event: string, ...args: any[]): boolean {
    return super.emit(event, ...args)
  }
}

class ModuleServiceRegistryImpl implements ModuleServiceRegistry {
  private services = new Map<string, any>()
  
  register(name: string, service: any): void {
    this.services.set(name, service)
  }
  
  get(name: string): any {
    return this.services.get(name)
  }
  
  has(name: string): boolean {
    return this.services.has(name)
  }
  
  remove(name: string): void {
    this.services.delete(name)
  }
}

export class ModuleRegistryImpl implements ModuleRegistry {
  public modules = new Map<string, ModuleInterface>()
  private events = new ModuleEventEmitterImpl()
  private services = new ModuleServiceRegistryImpl()
  
  async register(module: ModuleInterface): Promise<void> {
    const { name, version } = module.config
    
    // Check if module already exists
    if (this.modules.has(name)) {
      throw new Error(`Module ${name} is already registered`)
    }
    
    // Validate dependencies
    await this.validateDependencies(module)
    
    // Store module in registry
    this.modules.set(name, module)
    
    // Update database
    await prisma.module.upsert({
      where: { name },
      update: { version, status: 'INSTALLED' },
      create: { name, version, status: 'INSTALLED' }
    })
    
    // Run install lifecycle
    if (module.install) {
      const context = this.createContext(module)
      await module.install(context)
    }
    
    this.events.emit('module:registered', { name, version })
  }
  
  async unregister(name: string): Promise<void> {
    const module = this.modules.get(name)
    if (!module) {
      throw new Error(`Module ${name} is not registered`)
    }
    
    // Deactivate if active
    if (await this.isActive(name)) {
      await this.deactivate(name)
    }
    
    // Run uninstall lifecycle
    if (module.uninstall) {
      const context = this.createContext(module)
      await module.uninstall(context)
    }
    
    // Remove from registry
    this.modules.delete(name)
    
    // Update database
    await prisma.module.delete({ where: { name } })
    
    this.events.emit('module:unregistered', { name })
  }
  
  get(name: string): ModuleInterface | undefined {
    return this.modules.get(name)
  }
  
  list(): ModuleInterface[] {
    return Array.from(this.modules.values())
  }
  
  async isActive(name: string): Promise<boolean> {
    const dbModule = await prisma.module.findUnique({ where: { name } })
    return dbModule?.status === 'ACTIVE'
  }
  
  async activate(name: string): Promise<void> {
    const module = this.modules.get(name)
    if (!module) {
      throw new Error(`Module ${name} is not registered`)
    }
    
    // Check if already active
    if (await this.isActive(name)) {
      return
    }
    
    // Run activate lifecycle
    if (module.activate) {
      const context = this.createContext(module)
      await module.activate(context)
    }
    
    // Update database
    await prisma.module.update({
      where: { name },
      data: { status: 'ACTIVE' }
    })
    
    this.events.emit('module:activated', { name })
  }
  
  async deactivate(name: string): Promise<void> {
    const module = this.modules.get(name)
    if (!module) {
      throw new Error(`Module ${name} is not registered`)
    }
    
    // Check if already inactive
    if (!(await this.isActive(name))) {
      return
    }
    
    // Run deactivate lifecycle
    if (module.deactivate) {
      const context = this.createContext(module)
      await module.deactivate(context)
    }
    
    // Update database
    await prisma.module.update({
      where: { name },
      data: { status: 'INACTIVE' }
    })
    
    this.events.emit('module:deactivated', { name })
  }
  
  private createContext(module: ModuleInterface): ModuleContext {
    return {
      prisma,
      config: module.getDefaultConfig?.() || {},
      events: this.events,
      services: this.services
    }
  }
  
  private async validateDependencies(module: ModuleInterface): Promise<void> {
    const { requires } = module.config
    
    if (requires?.modules) {
      for (const [moduleName, version] of Object.entries(requires.modules)) {
        const dependency = this.modules.get(moduleName)
        if (!dependency) {
          throw new Error(`Required module ${moduleName} is not installed`)
        }
        
        // TODO: Add version checking logic
      }
    }
  }
}

// Global module registry instance
export const moduleRegistry = new ModuleRegistryImpl()