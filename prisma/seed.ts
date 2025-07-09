import { PrismaClient, Role } from '@prisma/client'
import { hashPassword } from '../src/lib/security'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create default admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@freedompress.local'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  })

  if (!existingAdmin) {
    const hashedPassword = await hashPassword(adminPassword)
    
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'System Administrator',
        password: hashedPassword,
        role: Role.ADMIN,
        isActive: true,
        emailVerified: new Date()
      }
    })
    console.log(`✅ Created admin user: ${admin.email}`)
  } else {
    console.log(`ℹ️  Admin user already exists: ${existingAdmin.email}`)
  }

  // Create demo user
  const demoEmail = 'demo@freedompress.local'
  const demoPassword = 'demo123'

  const existingDemo = await prisma.user.findUnique({
    where: { email: demoEmail }
  })

  if (!existingDemo) {
    const hashedPassword = await hashPassword(demoPassword)
    
    const demo = await prisma.user.create({
      data: {
        email: demoEmail,
        name: 'Demo User',
        password: hashedPassword,
        role: Role.USER,
        isActive: true,
        emailVerified: new Date()
      }
    })
    console.log(`✅ Created demo user: ${demo.email}`)
  } else {
    console.log(`ℹ️  Demo user already exists: ${existingDemo.email}`)
  }

  // Create default settings
  const defaultSettings = [
    {
      key: 'site_title',
      value: 'FreedomPress Core',
      type: 'string',
      category: 'general'
    },
    {
      key: 'site_description',
      value: 'A secure, modular content management framework',
      type: 'string',
      category: 'general'
    },
    {
      key: 'site_url',
      value: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      type: 'string',
      category: 'general'
    },
    {
      key: 'admin_email',
      value: adminEmail,
      type: 'string',
      category: 'admin'
    },
    {
      key: 'registration_enabled',
      value: 'false',
      type: 'boolean',
      category: 'auth'
    },
    {
      key: 'rate_limit_enabled',
      value: 'true',
      type: 'boolean',
      category: 'security'
    },
    {
      key: 'audit_retention_days',
      value: '90',
      type: 'number',
      category: 'security'
    }
  ]

  for (const setting of defaultSettings) {
    const existing = await prisma.setting.findUnique({
      where: { key: setting.key }
    })

    if (!existing) {
      await prisma.setting.create({
        data: setting
      })
      console.log(`✅ Created setting: ${setting.key}`)
    } else {
      console.log(`ℹ️  Setting already exists: ${setting.key}`)
    }
  }

  // Create audit log for seeding
  await prisma.auditLog.create({
    data: {
      action: 'DATABASE_SEED',
      resource: 'system',
      details: JSON.stringify({
        timestamp: new Date().toISOString(),
        seedVersion: '1.0.0'
      }),
      success: true
    }
  })

  console.log('🎉 Database seeding completed successfully!')
  console.log('\n📝 Default credentials:')
  console.log(`   Admin: ${adminEmail} / ${adminPassword}`)
  console.log(`   Demo:  ${demoEmail} / ${demoPassword}`)
  console.log('\n⚠️  Remember to change these credentials in production!')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })