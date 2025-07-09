#!/usr/bin/env node

import { Command } from 'commander'
import { initProject } from './commands/init'
import { moduleCommands } from './commands/module'
import { devServer, devBuild, devLint } from './commands/dev'
import { buildProject } from './commands/build'
import { validateEnvironment } from '../lib/security'

const program = new Command()

program
  .name('freedompress')
  .description('FreedomPress CLI - Modern CMS framework')
  .version('1.0.0')

// Initialize new project
program
  .command('init')
  .description('Initialize a new FreedomPress project')
  .option('-n, --name <name>', 'Project name')
  .option('-t, --template <template>', 'Template to use', 'basic')
  .action(initProject)

// Module management
program.addCommand(moduleCommands)

// Development server
program
  .command('dev')
  .description('Start development server')
  .option('-p, --port <port>', 'Port to run on', '3000')
  .option('--host <host>', 'Host to bind to', 'localhost')
  .action(devServer)

// Build project
program
  .command('build')
  .description('Build project for production')
  .option('--analyze', 'Analyze bundle size')
  .option('--strict', 'Strict mode (fail on warnings)')
  .option('--debug', 'Enable debug output')
  .option('--standalone', 'Build standalone output')
  .action(buildProject)

// Additional build commands
program
  .command('lint')
  .description('Lint project files')
  .option('--fix', 'Automatically fix linting errors')
  .option('--strict', 'Strict mode (fail on warnings)')
  .action(devLint)

// Database commands
program
  .command('db')
  .description('Database management commands')
  .addCommand(createDbCommands())

// Security validation
program
  .command('check')
  .description('Run security and environment checks')
  .action(async () => {
    try {
      validateEnvironment()
      console.log('✅ All security checks passed')
    } catch (error) {
      console.error('❌ Security check failed:', (error as Error).message)
      process.exit(1)
    }
  })

function createDbCommands() {
  const db = new Command('db')
  
  db.command('migrate')
    .description('Run database migrations')
    .action(async () => {
      const { exec } = require('child_process')
      exec('npx prisma migrate deploy', (error: any, stdout: any, stderr: any) => {
        if (error) {
          console.error('Migration failed:', error)
          process.exit(1)
        }
        console.log(stdout)
      })
    })

  db.command('seed')
    .description('Seed database with sample data')
    .action(async () => {
      const { exec } = require('child_process')
      exec('npx prisma db seed', (error: any, stdout: any, stderr: any) => {
        if (error) {
          console.error('Seeding failed:', error)
          process.exit(1)
        }
        console.log(stdout)
      })
    })

  db.command('studio')
    .description('Open Prisma Studio')
    .action(async () => {
      const { exec } = require('child_process')
      exec('npx prisma studio', (error: any, stdout: any, stderr: any) => {
        if (error) {
          console.error('Studio failed:', error)
          process.exit(1)
        }
        console.log(stdout)
      })
    })

  return db
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Parse command line arguments
program.parse()

export default program