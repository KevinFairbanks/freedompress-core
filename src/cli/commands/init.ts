import inquirer from 'inquirer'
import chalk from 'chalk'
import ora from 'ora'
import fs from 'fs-extra'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface InitOptions {
  name?: string
  template?: string
}

export async function initProject(options: InitOptions) {
  console.log(chalk.blue.bold('🚀 Welcome to FreedomPress!'))
  console.log(chalk.gray('Let\'s create your new project...\n'))

  // Get project configuration
  const config = await getProjectConfig(options)
  
  // Create project
  await createProject(config)
  
  console.log(chalk.green.bold('\n✅ Project created successfully!'))
  console.log(chalk.yellow('\nNext steps:'))
  console.log(chalk.white(`  cd ${config.name}`))
  console.log(chalk.white('  npm install'))
  console.log(chalk.white('  cp .env.example .env.local'))
  console.log(chalk.white('  npm run db:migrate'))
  console.log(chalk.white('  npm run dev'))
}

async function getProjectConfig(options: InitOptions) {
  const questions: any[] = []

  if (!options.name) {
    questions.push({
      type: 'input',
      name: 'name',
      message: 'Project name:',
      default: 'my-freedompress-site',
      validate: (input: string) => {
        if (!input || input.trim() === '') {
          return 'Project name is required'
        }
        if (!/^[a-zA-Z0-9-_]+$/.test(input)) {
          return 'Project name can only contain letters, numbers, hyphens, and underscores'
        }
        return true
      }
    })
  }

  if (!options.template) {
    questions.push({
      type: 'list',
      name: 'template',
      message: 'Choose a template:',
      choices: [
        { name: 'Basic - Core framework only', value: 'basic' },
        { name: 'Blog - Core + Blog module', value: 'blog' },
        { name: 'Ecommerce - Core + Shop module', value: 'ecommerce' },
        { name: 'Full - All modules included', value: 'full' }
      ],
      default: 'basic'
    })
  }

  questions.push({
    type: 'list',
    name: 'database',
    message: 'Database type:',
    choices: [
      { name: 'SQLite (Development)', value: 'sqlite' },
      { name: 'PostgreSQL (Production)', value: 'postgresql' }
    ],
    default: 'sqlite'
  })

  questions.push({
    type: 'confirm',
    name: 'typescript',
    message: 'Use TypeScript?',
    default: true
  })

  questions.push({
    type: 'confirm',
    name: 'tailwind',
    message: 'Use Tailwind CSS?',
    default: true
  })

  const answers = await inquirer.prompt(questions)
  
  return {
    name: options.name || answers.name,
    template: options.template || answers.template,
    database: answers.database,
    typescript: answers.typescript,
    tailwind: answers.tailwind
  }
}

async function createProject(config: any) {
  const spinner = ora('Creating project structure...').start()
  
  try {
    // Create project directory
    const projectPath = path.join(process.cwd(), config.name)
    await fs.ensureDir(projectPath)
    
    // Initialize Next.js project
    spinner.text = 'Initializing Next.js project...'
    const nextFlags = []
    if (config.typescript) nextFlags.push('--typescript')
    if (config.tailwind) nextFlags.push('--tailwind')
    nextFlags.push('--eslint', '--src-dir', '--app')
    
    await execAsync(`npx create-next-app@latest ${config.name} ${nextFlags.join(' ')} --yes`, {
      cwd: process.cwd()
    })
    
    // Install FreedomPress dependencies
    spinner.text = 'Installing FreedomPress dependencies...'
    const dependencies = [
      '@freedompress/core',
      'next-auth',
      'prisma',
      '@prisma/client'
    ]
    
    // Add template-specific dependencies
    if (config.template === 'blog' || config.template === 'full') {
      dependencies.push('@freedompress/blog')
    }
    
    if (config.template === 'ecommerce' || config.template === 'full') {
      dependencies.push('@freedompress/ecommerce')
    }
    
    await execAsync(`npm install ${dependencies.join(' ')}`, {
      cwd: projectPath
    })
    
    // Set up configuration files
    spinner.text = 'Setting up configuration...'
    await setupConfiguration(projectPath, config)
    
    // Set up database
    spinner.text = 'Setting up database...'
    await setupDatabase(projectPath, config)
    
    spinner.succeed('Project created successfully!')
    
  } catch (error) {
    spinner.fail('Failed to create project')
    console.error(chalk.red('Error:'), (error as Error).message)
    process.exit(1)
  }
}

async function setupConfiguration(projectPath: string, config: any) {
  // Create .env.example
  const envExample = `# Database
DATABASE_URL="${config.database === 'sqlite' ? 'file:./dev.db' : 'postgresql://user:password@localhost:5432/freedompress'}"

# NextAuth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-a-secure-secret-here-minimum-32-characters

# OAuth Providers (Optional)
GITHUB_ID=
GITHUB_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Environment
NODE_ENV=development
`

  await fs.writeFile(path.join(projectPath, '.env.example'), envExample)
  
  // Create freedompress.config.js
  const configContent = `/** @type {import('@freedompress/core').Config} */
module.exports = {
  modules: [
    ${config.template === 'blog' || config.template === 'full' ? "'@freedompress/blog'," : ''}
    ${config.template === 'ecommerce' || config.template === 'full' ? "'@freedompress/ecommerce'," : ''}
  ],
  database: {
    type: '${config.database}',
  },
  security: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    }
  },
  cache: {
    type: 'memory', // or 'redis'
    ttl: 3600 // 1 hour
  }
}
`

  await fs.writeFile(path.join(projectPath, 'freedompress.config.js'), configContent)
}

async function setupDatabase(projectPath: string, config: any) {
  // Create prisma directory and schema
  const prismaDir = path.join(projectPath, 'prisma')
  await fs.ensureDir(prismaDir)
  
  const schema = `// This is your Prisma schema file
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${config.database === 'sqlite' ? 'sqlite' : 'postgresql'}"
  url      = env("DATABASE_URL")
}

// FreedomPress Core Models
model User {
  id          String    @id @default(cuid())
  email       String    @unique
  name        String?
  password    String?
  role        Role      @default(USER)
  isActive    Boolean   @default(true)
  emailVerified DateTime?
  
  // Account security
  failedAttempts Int      @default(0)
  lockedUntil   DateTime?
  lastLogin     DateTime?
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  accounts    Account[]
  sessions    Session[]
  auditLogs   AuditLog[]
  
  @@map("users")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}

model AuditLog {
  id          String   @id @default(cuid())
  userId      String?
  action      String
  resource    String
  details     String?
  ipAddress   String?
  userAgent   String?
  success     Boolean  @default(true)
  createdAt   DateTime @default(now())
  
  user        User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  
  @@map("audit_logs")
  @@index([userId])
  @@index([action])
  @@index([createdAt])
}

enum Role {
  USER
  ADMIN
  MODERATOR
}
`

  await fs.writeFile(path.join(prismaDir, 'schema.prisma'), schema)
}