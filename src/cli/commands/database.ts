import { Command } from 'commander'
import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'

const dbCommands = new Command('db')

dbCommands
  .command('migrate')
  .description('Run database migrations')
  .option('--reset', 'Reset database before migrating')
  .action(async (options: { reset?: boolean }) => {
    try {
      if (options.reset) {
        console.log('🔄 Resetting database...')
        execSync('npx prisma migrate reset --force', { stdio: 'inherit' })
      } else {
        console.log('📦 Running migrations...')
        execSync('npx prisma migrate dev', { stdio: 'inherit' })
      }
      
      console.log('✅ Database migrations completed')
    } catch (error) {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }
  })

dbCommands
  .command('seed')
  .description('Seed the database with initial data')
  .action(async () => {
    try {
      console.log('🌱 Seeding database...')
      execSync('npm run db:seed', { stdio: 'inherit' })
      console.log('✅ Database seeded successfully')
    } catch (error) {
      console.error('❌ Seeding failed:', error)
      process.exit(1)
    }
  })

dbCommands
  .command('reset')
  .description('Reset database (WARNING: This will delete all data)')
  .option('--force', 'Skip confirmation prompt')
  .action(async (options: { force?: boolean }) => {
    if (!options.force) {
      console.log('⚠️  WARNING: This will delete ALL data in your database!')
      console.log('Use --force flag to confirm this action.')
      process.exit(1)
    }
    
    try {
      console.log('🔄 Resetting database...')
      execSync('npx prisma migrate reset --force', { stdio: 'inherit' })
      console.log('✅ Database reset completed')
    } catch (error) {
      console.error('❌ Reset failed:', error)
      process.exit(1)
    }
  })

dbCommands
  .command('studio')
  .description('Open Prisma Studio')
  .action(async () => {
    try {
      console.log('🎨 Opening Prisma Studio...')
      execSync('npx prisma studio', { stdio: 'inherit' })
    } catch (error) {
      console.error('❌ Failed to open Prisma Studio:', error)
      process.exit(1)
    }
  })

dbCommands
  .command('status')
  .description('Check database connection and status')
  .action(async () => {
    try {
      console.log('🔍 Checking database status...')
      
      const prisma = new PrismaClient()
      
      // Test connection
      await prisma.$connect()
      console.log('✅ Database connection: OK')
      
      // Count records
      const userCount = await prisma.user.count()
      const moduleCount = await prisma.module.count()
      const settingCount = await prisma.setting.count()
      const auditLogCount = await prisma.auditLog.count()
      
      console.log('\n📊 Database Statistics:')
      console.log(`  Users: ${userCount}`)
      console.log(`  Modules: ${moduleCount}`)
      console.log(`  Settings: ${settingCount}`)
      console.log(`  Audit Logs: ${auditLogCount}`)
      
      await prisma.$disconnect()
    } catch (error) {
      console.error('❌ Database check failed:', error)
      process.exit(1)
    }
  })

dbCommands
  .command('backup')
  .description('Create a database backup')
  .option('-o, --output <file>', 'Output file path')
  .action(async (options: { output?: string }) => {
    try {
      const outputFile = options.output || `backup-${Date.now()}.db`
      console.log(`💾 Creating database backup: ${outputFile}`)
      
      // For SQLite, just copy the file
      execSync(`cp prisma/dev.db ${outputFile}`, { stdio: 'inherit' })
      console.log(`✅ Backup created: ${outputFile}`)
    } catch (error) {
      console.error('❌ Backup failed:', error)
      process.exit(1)
    }
  })

export { dbCommands }