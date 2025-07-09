import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { ModuleManager } from '../../src/modules/ModuleManager'
import { Module, ModuleConfig } from '../../src/modules/types'

// Mock module for testing
const mockModule: Module = {
  id: 'test-module',
  name: 'Test Module',
  version: '1.0.0',
  description: 'A test module',
  dependencies: [],
  config: {
    enabled: true,
    settings: {
      testSetting: 'value',
    },
  },
  routes: [
    {
      path: '/test',
      method: 'GET',
      handler: jest.fn(),
    },
  ],
  components: [
    {
      name: 'TestComponent',
      component: jest.fn(),
    },
  ],
  hooks: [
    {
      name: 'test:hook',
      handler: jest.fn(),
    },
  ],
  install: jest.fn(),
  uninstall: jest.fn(),
  activate: jest.fn(),
  deactivate: jest.fn(),
}

const dependentModule: Module = {
  id: 'dependent-module',
  name: 'Dependent Module',
  version: '1.0.0',
  description: 'A module that depends on test-module',
  dependencies: ['test-module'],
  config: {
    enabled: true,
  },
  install: jest.fn(),
  uninstall: jest.fn(),
  activate: jest.fn(),
  deactivate: jest.fn(),
}

describe('ModuleManager', () => {
  let moduleManager: ModuleManager

  beforeEach(() => {
    moduleManager = new ModuleManager()
    jest.clearAllMocks()
  })

  describe('registerModule', () => {
    it('should register a module successfully', async () => {
      await moduleManager.registerModule(mockModule)

      const registeredModule = moduleManager.getModule('test-module')
      expect(registeredModule).toBeDefined()
      expect(registeredModule?.id).toBe('test-module')
      expect(registeredModule?.name).toBe('Test Module')
    })

    it('should throw error when registering duplicate module', async () => {
      await moduleManager.registerModule(mockModule)

      await expect(moduleManager.registerModule(mockModule))
        .rejects.toThrow('Module test-module is already registered')
    })

    it('should call module install method', async () => {
      await moduleManager.registerModule(mockModule)

      expect(mockModule.install).toHaveBeenCalled()
    })
  })

  describe('unregisterModule', () => {
    it('should unregister a module successfully', async () => {
      await moduleManager.registerModule(mockModule)
      await moduleManager.unregisterModule('test-module')

      const module = moduleManager.getModule('test-module')
      expect(module).toBeUndefined()
    })

    it('should throw error when unregistering non-existent module', async () => {
      await expect(moduleManager.unregisterModule('non-existent'))
        .rejects.toThrow('Module non-existent is not registered')
    })

    it('should call module uninstall method', async () => {
      await moduleManager.registerModule(mockModule)
      await moduleManager.unregisterModule('test-module')

      expect(mockModule.uninstall).toHaveBeenCalled()
    })

    it('should throw error when unregistering module with dependencies', async () => {
      await moduleManager.registerModule(mockModule)
      await moduleManager.registerModule(dependentModule)

      await expect(moduleManager.unregisterModule('test-module'))
        .rejects.toThrow('Cannot unregister module test-module: dependent modules exist')
    })
  })

  describe('activateModule', () => {
    it('should activate a module successfully', async () => {
      await moduleManager.registerModule(mockModule)
      await moduleManager.activateModule('test-module')

      const module = moduleManager.getModule('test-module')
      expect(module?.config.enabled).toBe(true)
      expect(mockModule.activate).toHaveBeenCalled()
    })

    it('should throw error when activating non-existent module', async () => {
      await expect(moduleManager.activateModule('non-existent'))
        .rejects.toThrow('Module non-existent is not registered')
    })

    it('should activate dependencies first', async () => {
      const inactiveMockModule = { ...mockModule, config: { enabled: false } }
      const inactiveDependentModule = { ...dependentModule, config: { enabled: false } }

      await moduleManager.registerModule(inactiveMockModule)
      await moduleManager.registerModule(inactiveDependentModule)

      await moduleManager.activateModule('dependent-module')

      expect(inactiveMockModule.activate).toHaveBeenCalled()
      expect(inactiveDependentModule.activate).toHaveBeenCalled()
    })
  })

  describe('deactivateModule', () => {
    it('should deactivate a module successfully', async () => {
      await moduleManager.registerModule(mockModule)
      await moduleManager.deactivateModule('test-module')

      const module = moduleManager.getModule('test-module')
      expect(module?.config.enabled).toBe(false)
      expect(mockModule.deactivate).toHaveBeenCalled()
    })

    it('should throw error when deactivating non-existent module', async () => {
      await expect(moduleManager.deactivateModule('non-existent'))
        .rejects.toThrow('Module non-existent is not registered')
    })

    it('should throw error when deactivating module with active dependencies', async () => {
      await moduleManager.registerModule(mockModule)
      await moduleManager.registerModule(dependentModule)

      await expect(moduleManager.deactivateModule('test-module'))
        .rejects.toThrow('Cannot deactivate module test-module: active dependent modules exist')
    })
  })

  describe('getModule', () => {
    it('should return module by id', async () => {
      await moduleManager.registerModule(mockModule)

      const module = moduleManager.getModule('test-module')
      expect(module).toBeDefined()
      expect(module?.id).toBe('test-module')
    })

    it('should return undefined for non-existent module', () => {
      const module = moduleManager.getModule('non-existent')
      expect(module).toBeUndefined()
    })
  })

  describe('getAllModules', () => {
    it('should return all registered modules', async () => {
      await moduleManager.registerModule(mockModule)
      await moduleManager.registerModule(dependentModule)

      const modules = moduleManager.getAllModules()
      expect(modules).toHaveLength(2)
      expect(modules.map(m => m.id)).toContain('test-module')
      expect(modules.map(m => m.id)).toContain('dependent-module')
    })

    it('should return empty array when no modules registered', () => {
      const modules = moduleManager.getAllModules()
      expect(modules).toEqual([])
    })
  })

  describe('getActiveModules', () => {
    it('should return only active modules', async () => {
      const activeModule = { ...mockModule, config: { enabled: true } }
      const inactiveModule = { ...dependentModule, config: { enabled: false } }

      await moduleManager.registerModule(activeModule)
      await moduleManager.registerModule(inactiveModule)

      const activeModules = moduleManager.getActiveModules()
      expect(activeModules).toHaveLength(1)
      expect(activeModules[0].id).toBe('test-module')
    })
  })

  describe('updateModuleConfig', () => {
    it('should update module configuration', async () => {
      await moduleManager.registerModule(mockModule)

      const newConfig: ModuleConfig = {
        enabled: false,
        settings: {
          testSetting: 'newValue',
          newSetting: 'test',
        },
      }

      await moduleManager.updateModuleConfig('test-module', newConfig)

      const module = moduleManager.getModule('test-module')
      expect(module?.config).toEqual(newConfig)
    })

    it('should throw error when updating non-existent module', async () => {
      await expect(moduleManager.updateModuleConfig('non-existent', { enabled: true }))
        .rejects.toThrow('Module non-existent is not registered')
    })
  })

  describe('resolveDependencies', () => {
    it('should resolve dependencies in correct order', async () => {
      await moduleManager.registerModule(mockModule)
      await moduleManager.registerModule(dependentModule)

      const resolved = moduleManager.resolveDependencies('dependent-module')
      expect(resolved).toEqual(['test-module', 'dependent-module'])
    })

    it('should throw error for circular dependencies', async () => {
      const circularModule1: Module = {
        id: 'circular1',
        name: 'Circular 1',
        version: '1.0.0',
        dependencies: ['circular2'],
        config: { enabled: true },
        install: jest.fn(),
        uninstall: jest.fn(),
        activate: jest.fn(),
        deactivate: jest.fn(),
      }

      const circularModule2: Module = {
        id: 'circular2',
        name: 'Circular 2',
        version: '1.0.0',
        dependencies: ['circular1'],
        config: { enabled: true },
        install: jest.fn(),
        uninstall: jest.fn(),
        activate: jest.fn(),
        deactivate: jest.fn(),
      }

      await moduleManager.registerModule(circularModule1)
      await moduleManager.registerModule(circularModule2)

      expect(() => moduleManager.resolveDependencies('circular1'))
        .toThrow('Circular dependency detected')
    })

    it('should throw error for missing dependencies', async () => {
      await moduleManager.registerModule(dependentModule)

      expect(() => moduleManager.resolveDependencies('dependent-module'))
        .toThrow('Missing dependency: test-module')
    })
  })

  describe('getModuleRoutes', () => {
    it('should return routes from active modules', async () => {
      await moduleManager.registerModule(mockModule)

      const routes = moduleManager.getModuleRoutes()
      expect(routes).toHaveLength(1)
      expect(routes[0].path).toBe('/test')
      expect(routes[0].method).toBe('GET')
    })

    it('should not return routes from inactive modules', async () => {
      const inactiveModule = { ...mockModule, config: { enabled: false } }
      await moduleManager.registerModule(inactiveModule)

      const routes = moduleManager.getModuleRoutes()
      expect(routes).toHaveLength(0)
    })
  })

  describe('getModuleComponents', () => {
    it('should return components from active modules', async () => {
      await moduleManager.registerModule(mockModule)

      const components = moduleManager.getModuleComponents()
      expect(components).toHaveLength(1)
      expect(components[0].name).toBe('TestComponent')
    })

    it('should not return components from inactive modules', async () => {
      const inactiveModule = { ...mockModule, config: { enabled: false } }
      await moduleManager.registerModule(inactiveModule)

      const components = moduleManager.getModuleComponents()
      expect(components).toHaveLength(0)
    })
  })

  describe('executeHook', () => {
    it('should execute hooks from active modules', async () => {
      await moduleManager.registerModule(mockModule)

      const context = { data: 'test' }
      await moduleManager.executeHook('test:hook', context)

      expect(mockModule.hooks?.[0].handler).toHaveBeenCalledWith(context)
    })

    it('should not execute hooks from inactive modules', async () => {
      const inactiveModule = { ...mockModule, config: { enabled: false } }
      await moduleManager.registerModule(inactiveModule)

      const context = { data: 'test' }
      await moduleManager.executeHook('test:hook', context)

      expect(inactiveModule.hooks?.[0].handler).not.toHaveBeenCalled()
    })

    it('should handle hook execution errors gracefully', async () => {
      const errorModule = {
        ...mockModule,
        hooks: [{
          name: 'test:hook',
          handler: jest.fn().mockRejectedValue(new Error('Hook error')),
        }],
      }

      await moduleManager.registerModule(errorModule)

      // Should not throw error
      await expect(moduleManager.executeHook('test:hook', {}))
        .resolves.not.toThrow()
    })
  })
})