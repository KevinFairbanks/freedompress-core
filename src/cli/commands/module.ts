import { Command } from 'commander'
import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'

const moduleCommands = new Command('module')

moduleCommands
  .command('install <name>')
  .description('Install a module')
  .option('-v, --version <version>', 'Specific version to install')
  .action(async (name: string, options: { version?: string }) => {
    console.log(`📦 Installing module: ${name}`)
    
    try {
      const packageName = `@freedompress/${name}`
      const version = options.version ? `@${options.version}` : ''
      
      execSync(`npm install ${packageName}${version}`, { stdio: 'inherit' })
      console.log(`✅ Module ${name} installed successfully`)
      
      // Register module in database
      const prisma = new PrismaClient()
      await prisma.module.create({
        data: {
          name,
          version: options.version || 'latest',
          status: 'INSTALLED'
        }
      })
      await prisma.$disconnect()
      
      console.log(`📋 Module ${name} registered in database`)
    } catch (error) {
      console.error(`❌ Failed to install module ${name}:`, error)
      process.exit(1)
    }
  })

moduleCommands
  .command('activate <name>')
  .description('Activate a module')
  .action(async (name: string) => {
    console.log(`🔌 Activating module: ${name}`)
    
    try {
      const prisma = new PrismaClient()
      
      const module = await prisma.module.findUnique({
        where: { name }
      })
      
      if (!module) {
        console.error(`❌ Module ${name} not found. Install it first.`)
        process.exit(1)
      }
      
      await prisma.module.update({
        where: { name },
        data: { status: 'ACTIVE' }
      })
      
      await prisma.$disconnect()
      console.log(`✅ Module ${name} activated`)
    } catch (error) {
      console.error(`❌ Failed to activate module ${name}:`, error)
      process.exit(1)
    }
  })

moduleCommands
  .command('deactivate <name>')
  .description('Deactivate a module')
  .action(async (name: string) => {
    console.log(`🔌 Deactivating module: ${name}`)
    
    try {
      const prisma = new PrismaClient()
      
      await prisma.module.update({
        where: { name },
        data: { status: 'INACTIVE' }
      })
      
      await prisma.$disconnect()
      console.log(`✅ Module ${name} deactivated`)
    } catch (error) {
      console.error(`❌ Failed to deactivate module ${name}:`, error)
      process.exit(1)
    }
  })

moduleCommands
  .command('list')
  .description('List all modules')
  .action(async () => {
    try {
      const prisma = new PrismaClient()
      
      const modules = await prisma.module.findMany({
        orderBy: { name: 'asc' }
      })
      
      await prisma.$disconnect()
      
      if (modules.length === 0) {
        console.log('📋 No modules installed')
        return
      }
      
      console.log('📋 Installed modules:')
      console.log('')
      
      modules.forEach(module => {
        const status = module.status === 'ACTIVE' ? '🟢' : '🔴'
        console.log(`  ${status} ${module.name} (v${module.version}) - ${module.status}`)
      })
    } catch (error) {
      console.error('❌ Failed to list modules:', error)
      process.exit(1)
    }
  })

moduleCommands
  .command('uninstall <name>')
  .description('Uninstall a module')
  .action(async (name: string) => {
    console.log(`🗑️  Uninstalling module: ${name}`)
    
    try {
      const prisma = new PrismaClient()
      
      // Deactivate first
      await prisma.module.updateMany({
        where: { name },
        data: { status: 'INACTIVE' }
      })
      
      // Remove from database
      await prisma.module.deleteMany({
        where: { name }
      })
      
      await prisma.$disconnect()
      
      // Uninstall package
      const packageName = `@freedompress/${name}`
      execSync(`npm uninstall ${packageName}`, { stdio: 'inherit' })
      
      console.log(`✅ Module ${name} uninstalled successfully`)
    } catch (error) {
      console.error(`❌ Failed to uninstall module ${name}:`, error)
      process.exit(1)
    }
  })

export { moduleCommands }