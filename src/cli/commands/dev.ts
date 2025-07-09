import { Command } from 'commander'
import { execSync } from 'child_process'

const devCommands = new Command('dev')

devCommands
  .command('start')
  .description('Start development server')
  .option('-p, --port <port>', 'Port to run on', '3000')
  .action(async (options: { port: string }) => {
    try {
      console.log(`🚀 Starting development server on port ${options.port}...`)
      process.env.PORT = options.port
      execSync('npm run dev', { stdio: 'inherit' })
    } catch (error) {
      console.error('❌ Failed to start development server:', error)
      process.exit(1)
    }
  })

devCommands
  .command('build')
  .description('Build the application for production')
  .action(async () => {
    try {
      console.log('🏗️  Building application...')
      execSync('npm run build', { stdio: 'inherit' })
      console.log('✅ Build completed')
    } catch (error) {
      console.error('❌ Build failed:', error)
      process.exit(1)
    }
  })

devCommands
  .command('lint')
  .description('Run linting')
  .option('--fix', 'Automatically fix linting errors')
  .action(async (options: { fix?: boolean }) => {
    try {
      const command = options.fix ? 'npm run lint -- --fix' : 'npm run lint'
      console.log('🔍 Running linter...')
      execSync(command, { stdio: 'inherit' })
      console.log('✅ Linting completed')
    } catch (error) {
      console.error('❌ Linting failed:', error)
      process.exit(1)
    }
  })

devCommands
  .command('test')
  .description('Run tests')
  .option('--watch', 'Run tests in watch mode')
  .option('--coverage', 'Generate coverage report')
  .action(async (options: { watch?: boolean; coverage?: boolean }) => {
    try {
      let command = 'npm test'
      
      if (options.watch) command += ' -- --watch'
      if (options.coverage) command += ' -- --coverage'
      
      console.log('🧪 Running tests...')
      execSync(command, { stdio: 'inherit' })
    } catch (error) {
      console.error('❌ Tests failed:', error)
      process.exit(1)
    }
  })

devCommands
  .command('clean')
  .description('Clean build artifacts and dependencies')
  .option('--deep', 'Also remove node_modules')
  .action(async (options: { deep?: boolean }) => {
    try {
      console.log('🧹 Cleaning build artifacts...')
      
      // Remove common build directories
      execSync('rm -rf .next dist build', { stdio: 'inherit' })
      
      if (options.deep) {
        console.log('🧹 Removing node_modules...')
        execSync('rm -rf node_modules', { stdio: 'inherit' })
        console.log('📦 Run "npm install" to reinstall dependencies')
      }
      
      console.log('✅ Cleanup completed')
    } catch (error) {
      console.error('❌ Cleanup failed:', error)
      process.exit(1)
    }
  })

devCommands
  .command('info')
  .description('Show project information')
  .action(async () => {
    try {
      console.log('📋 Project Information:')
      console.log('')
      
      // Node version
      const nodeVersion = process.version
      console.log(`  Node.js: ${nodeVersion}`)
      
      // NPM version
      try {
        const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim()
        console.log(`  NPM: v${npmVersion}`)
      } catch {}
      
      // Project dependencies
      try {
        const packageJson = require('../../../../package.json')
        console.log(`  Project: ${packageJson.name} v${packageJson.version}`)
        console.log('')
        console.log('  Key Dependencies:')
        if (packageJson.dependencies) {
          Object.entries(packageJson.dependencies).forEach(([name, version]) => {
            if (name.includes('next') || name.includes('react') || name.includes('prisma')) {
              console.log(`    ${name}: ${version}`)
            }
          })
        }
      } catch {}
      
      console.log('')
      console.log('  Environment:')
      console.log(`    NODE_ENV: ${process.env.NODE_ENV || 'development'}`)
      console.log(`    DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Not set'}`)
      console.log(`    NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET ? '✅ Set' : '❌ Not set'}`)
      
    } catch (error) {
      console.error('❌ Failed to get project info:', error)
    }
  })

export { devCommands }