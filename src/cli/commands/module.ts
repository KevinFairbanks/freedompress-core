import { Command } from 'commander'
import inquirer from 'inquirer'
import chalk from 'chalk'
import ora from 'ora'
import fs from 'fs-extra'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { moduleRegistry } from '../../lib/module-system'

const execAsync = promisify(exec)

export const moduleCommands = new Command('module')
  .description('Module management commands')

// Install module
moduleCommands
  .command('install')
  .description('Install a module')
  .argument('<module>', 'Module name (e.g., @freedompress/blog)')
  .option('--dev', 'Install as development dependency')
  .option('--force', 'Force installation even if already installed')
  .action(async (moduleName: string, options: any) => {
    const spinner = ora(`Installing module ${moduleName}...`).start()
    
    try {
      // Check if module is already installed
      if (!options.force && await isModuleInstalled(moduleName)) {
        spinner.warn(`Module ${moduleName} is already installed`)
        return
      }
      
      // Install via npm
      const devFlag = options.dev ? '--save-dev' : '--save'
      await execAsync(`npm install ${moduleName} ${devFlag}`)
      
      // Load and register module
      const module = await loadModule(moduleName)
      await moduleRegistry.register(module)
      
      // Update configuration
      await updateModuleConfig(moduleName, 'install')
      
      spinner.succeed(`Module ${moduleName} installed successfully`)
      
      console.log(chalk.green('\nNext steps:'))
      console.log(chalk.white(`  freedompress module activate ${moduleName}`))
      
    } catch (error) {
      spinner.fail(`Failed to install module ${moduleName}`)
      console.error(chalk.red('Error:'), (error as Error).message)
      process.exit(1)
    }
  })

// Uninstall module
moduleCommands
  .command('uninstall')
  .description('Uninstall a module')
  .argument('<module>', 'Module name')
  .option('--force', 'Force uninstallation')
  .action(async (moduleName: string, options: any) => {
    const spinner = ora(`Uninstalling module ${moduleName}...`).start()
    
    try {
      // Check if module is installed
      if (!await isModuleInstalled(moduleName)) {
        spinner.warn(`Module ${moduleName} is not installed`)
        return
      }
      
      // Deactivate if active
      if (await moduleRegistry.isActive(moduleName)) {
        await moduleRegistry.deactivate(moduleName)
      }
      
      // Unregister module
      await moduleRegistry.unregister(moduleName)
      
      // Remove from npm
      await execAsync(`npm uninstall ${moduleName}`)
      
      // Update configuration
      await updateModuleConfig(moduleName, 'uninstall')
      
      spinner.succeed(`Module ${moduleName} uninstalled successfully`)
      
    } catch (error) {
      spinner.fail(`Failed to uninstall module ${moduleName}`)
      console.error(chalk.red('Error:'), (error as Error).message)
      process.exit(1)
    }
  })

// List modules
moduleCommands
  .command('list')
  .description('List installed modules')
  .option('--active', 'Show only active modules')
  .option('--inactive', 'Show only inactive modules')
  .action(async (options: any) => {
    try {
      const modules = moduleRegistry.list()
      
      if (modules.length === 0) {
        console.log(chalk.yellow('No modules installed'))
        return
      }
      
      console.log(chalk.blue.bold('Installed Modules:'))
      console.log()
      
      for (const module of modules) {
        const isActive = await moduleRegistry.isActive(module.config.name)
        
        // Filter based on options
        if (options.active && !isActive) continue
        if (options.inactive && isActive) continue
        
        const status = isActive ? 
          chalk.green('✓ Active') : 
          chalk.gray('○ Inactive')
        
        console.log(`  ${status} ${chalk.white(module.config.name)} ${chalk.gray(`v${module.config.version}`)}`)
        if (module.config.description) {
          console.log(`    ${chalk.gray(module.config.description)}`)
        }
        console.log()
      }
      
    } catch (error) {
      console.error(chalk.red('Error:'), (error as Error).message)
      process.exit(1)
    }
  })

// Activate module
moduleCommands
  .command('activate')
  .description('Activate a module')
  .argument('<module>', 'Module name')
  .action(async (moduleName: string) => {
    const spinner = ora(`Activating module ${moduleName}...`).start()
    
    try {
      if (!await isModuleInstalled(moduleName)) {
        spinner.fail(`Module ${moduleName} is not installed`)
        return
      }
      
      if (await moduleRegistry.isActive(moduleName)) {
        spinner.warn(`Module ${moduleName} is already active`)
        return
      }
      
      await moduleRegistry.activate(moduleName)
      await updateModuleConfig(moduleName, 'activate')
      
      spinner.succeed(`Module ${moduleName} activated successfully`)
      
    } catch (error) {
      spinner.fail(`Failed to activate module ${moduleName}`)
      console.error(chalk.red('Error:'), (error as Error).message)
      process.exit(1)
    }
  })

// Deactivate module
moduleCommands
  .command('deactivate')
  .description('Deactivate a module')
  .argument('<module>', 'Module name')
  .action(async (moduleName: string) => {
    const spinner = ora(`Deactivating module ${moduleName}...`).start()
    
    try {
      if (!await isModuleInstalled(moduleName)) {
        spinner.fail(`Module ${moduleName} is not installed`)
        return
      }
      
      if (!await moduleRegistry.isActive(moduleName)) {
        spinner.warn(`Module ${moduleName} is already inactive`)
        return
      }
      
      await moduleRegistry.deactivate(moduleName)
      await updateModuleConfig(moduleName, 'deactivate')
      
      spinner.succeed(`Module ${moduleName} deactivated successfully`)
      
    } catch (error) {
      spinner.fail(`Failed to deactivate module ${moduleName}`)
      console.error(chalk.red('Error:'), (error as Error).message)
      process.exit(1)
    }
  })

// Module info
moduleCommands
  .command('info')
  .description('Show module information')
  .argument('<module>', 'Module name')
  .action(async (moduleName: string) => {
    try {
      const module = moduleRegistry.get(moduleName)
      
      if (!module) {
        console.log(chalk.red(`Module ${moduleName} is not installed`))
        return
      }
      
      const isActive = await moduleRegistry.isActive(moduleName)
      
      console.log(chalk.blue.bold(`Module: ${module.config.name}`))
      console.log(`Version: ${module.config.version}`)
      console.log(`Status: ${isActive ? chalk.green('Active') : chalk.gray('Inactive')}`)
      
      if (module.config.description) {
        console.log(`Description: ${module.config.description}`)
      }
      
      if (module.config.author) {
        console.log(`Author: ${module.config.author}`)
      }
      
      if (module.config.requires) {
        console.log('\nRequirements:')
        if (module.config.requires.core) {
          console.log(`  Core: ${module.config.requires.core}`)
        }
        if (module.config.requires.modules) {
          Object.entries(module.config.requires.modules).forEach(([name, version]) => {
            console.log(`  ${name}: ${version}`)
          })
        }
      }
      
      if (module.exports) {
        console.log('\nExports:')
        Object.keys(module.exports).forEach(exportType => {
          const items = Object.keys((module.exports as any)[exportType] || {})
          if (items.length > 0) {
            console.log(`  ${exportType}: ${items.join(', ')}`)
          }
        })
      }
      
    } catch (error) {
      console.error(chalk.red('Error:'), (error as Error).message)
      process.exit(1)
    }
  })

// Update module
moduleCommands
  .command('update')
  .description('Update a module')
  .argument('<module>', 'Module name')
  .option('--version <version>', 'Specific version to update to')
  .action(async (moduleName: string, options: any) => {
    const spinner = ora(`Updating module ${moduleName}...`).start()
    
    try {
      if (!await isModuleInstalled(moduleName)) {
        spinner.fail(`Module ${moduleName} is not installed`)
        return
      }
      
      const versionSpec = options.version ? `@${options.version}` : '@latest'
      await execAsync(`npm update ${moduleName}${versionSpec}`)
      
      // Reload module
      const module = await loadModule(moduleName)
      await moduleRegistry.unregister(moduleName)
      await moduleRegistry.register(module)
      
      spinner.succeed(`Module ${moduleName} updated successfully`)
      
    } catch (error) {
      spinner.fail(`Failed to update module ${moduleName}`)
      console.error(chalk.red('Error:'), (error as Error).message)
      process.exit(1)
    }
  })

// Helper functions
async function isModuleInstalled(moduleName: string): Promise<boolean> {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json')
    const packageJson = await fs.readJson(packageJsonPath)
    
    return !!(packageJson.dependencies?.[moduleName] || packageJson.devDependencies?.[moduleName])
  } catch {
    return false
  }
}

async function loadModule(moduleName: string): Promise<any> {
  try {
    const module = await import(moduleName)
    return module.default || module
  } catch (error) {
    throw new Error(`Failed to load module ${moduleName}: ${(error as Error).message}`)
  }
}

async function updateModuleConfig(moduleName: string, action: 'install' | 'uninstall' | 'activate' | 'deactivate') {
  try {
    const configPath = path.join(process.cwd(), 'freedompress.config.js')
    
    if (!await fs.pathExists(configPath)) {
      // Create default config
      const defaultConfig = `/** @type {import('@freedompress/core').Config} */
module.exports = {
  modules: [],
  database: {
    type: 'sqlite',
  },
  security: {
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 100
    }
  }
}
`
      await fs.writeFile(configPath, defaultConfig)
    }
    
    // Read current config
    const configContent = await fs.readFile(configPath, 'utf8')
    
    // Update modules array based on action
    let updatedContent = configContent
    
    if (action === 'install' || action === 'activate') {
      // Add module to modules array if not present
      if (!configContent.includes(`'${moduleName}'`)) {
        updatedContent = configContent.replace(
          /modules:\s*\[([^\]]*)\]/,
          `modules: [$1'${moduleName}',]`
        )
      }
    } else if (action === 'uninstall' || action === 'deactivate') {
      // Remove module from modules array
      updatedContent = configContent.replace(
        new RegExp(`'${moduleName}',?\\s*`, 'g'),
        ''
      )
    }
    
    await fs.writeFile(configPath, updatedContent)
    
  } catch (error) {
    console.warn(chalk.yellow(`Warning: Could not update config file: ${(error as Error).message}`))
  }
}