import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

interface InitOptions {
  name?: string
  directory?: string
  skipInstall?: boolean
}

export async function initProject(options: InitOptions) {
  const projectName = options.name || 'freedompress-project'
  const targetDir = options.directory || projectName
  const fullPath = path.resolve(process.cwd(), targetDir)

  console.log(`🚀 Initializing FreedomPress project: ${projectName}`)
  console.log(`📁 Target directory: ${fullPath}`)

  // Check if directory exists
  if (fs.existsSync(fullPath)) {
    console.error(`❌ Directory ${targetDir} already exists`)
    process.exit(1)
  }

  try {
    // Create project directory
    fs.mkdirSync(fullPath, { recursive: true })
    console.log('✅ Created project directory')

    // Copy template files
    const templateDir = path.join(__dirname, '..', '..', '..', 'template')
    if (fs.existsSync(templateDir)) {
      execSync(`cp -r ${templateDir}/* ${fullPath}/`, { stdio: 'inherit' })
      console.log('✅ Copied template files')
    } else {
      // Create basic structure if template doesn't exist
      createBasicStructure(fullPath, projectName)
    }

    // Update package.json with project name
    const packageJsonPath = path.join(fullPath, 'package.json')
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
      packageJson.name = projectName
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
      console.log('✅ Updated package.json')
    }

    // Install dependencies
    if (!options.skipInstall) {
      console.log('📦 Installing dependencies...')
      execSync('npm install', { cwd: fullPath, stdio: 'inherit' })
      console.log('✅ Dependencies installed')
    }

    // Initialize database
    console.log('🗄️  Setting up database...')
    execSync('npx prisma generate', { cwd: fullPath, stdio: 'inherit' })
    execSync('npx prisma db push', { cwd: fullPath, stdio: 'inherit' })
    execSync('npm run db:seed', { cwd: fullPath, stdio: 'inherit' })
    console.log('✅ Database initialized')

    console.log(`
🎉 Project ${projectName} created successfully!

Next steps:
  cd ${targetDir}
  npm run dev

🔑 Default credentials:
  Admin: admin@freedompress.local / admin123
  Demo:  demo@freedompress.local / demo123

📚 Documentation: https://docs.freedompress.dev
    `)

  } catch (error) {
    console.error('❌ Error initializing project:', error)
    process.exit(1)
  }
}

function createBasicStructure(projectPath: string, projectName: string) {
  const packageJson = {
    name: projectName,
    version: '0.1.0',
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
      lint: 'next lint',
      'db:generate': 'prisma generate',
      'db:migrate': 'prisma migrate dev',
      'db:push': 'prisma db push',
      'db:seed': 'ts-node prisma/seed.ts'
    },
    dependencies: {
      'freedompress-core': '^1.0.0',
      next: '^15.0.0',
      react: '^19.0.0',
      'react-dom': '^19.0.0'
    }
  }

  fs.writeFileSync(
    path.join(projectPath, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  )

  // Create basic directories
  fs.mkdirSync(path.join(projectPath, 'pages'), { recursive: true })
  fs.mkdirSync(path.join(projectPath, 'public'), { recursive: true })
  fs.mkdirSync(path.join(projectPath, 'styles'), { recursive: true })

  console.log('✅ Created basic project structure')
}