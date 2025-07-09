import { spawn } from 'child_process'
import chalk from 'chalk'
import ora from 'ora'
import fs from 'fs-extra'
import path from 'path'
import { validateEnvironment } from '../../lib/security'

interface DevOptions {
  port?: string
  host?: string
  https?: boolean
  watch?: boolean
  verbose?: boolean
}

export async function devServer(options: DevOptions) {
  console.log(chalk.blue.bold('🚀 Starting FreedomPress Development Server...'))
  
  try {
    // Validate environment
    validateEnvironment()
    
    // Check if we're in a FreedomPress project
    await validateProject()
    
    // Start development server
    await startDevServer(options)
    
  } catch (error) {
    console.error(chalk.red('❌ Failed to start development server:'), (error as Error).message)
    process.exit(1)
  }
}

async function validateProject() {
  const spinner = ora('Validating project...').start()
  
  try {
    // Check for package.json
    const packageJsonPath = path.join(process.cwd(), 'package.json')
    if (!await fs.pathExists(packageJsonPath)) {
      throw new Error('No package.json found. Are you in a FreedomPress project?')
    }
    
    const packageJson = await fs.readJson(packageJsonPath)
    
    // Check for FreedomPress core dependency
    const hasCoreFramework = 
      packageJson.dependencies?.['@freedompress/core'] ||
      packageJson.devDependencies?.['@freedompress/core']
    
    if (!hasCoreFramework) {
      throw new Error('FreedomPress core framework not found in dependencies')
    }
    
    // Check for Next.js
    const hasNextJs = 
      packageJson.dependencies?.['next'] ||
      packageJson.devDependencies?.['next']
    
    if (!hasNextJs) {
      throw new Error('Next.js not found in dependencies')
    }
    
    // Check for required files
    const requiredFiles = [
      'next.config.js',
      'tsconfig.json',
      'pages/_app.tsx'
    ]
    
    for (const file of requiredFiles) {
      if (!await fs.pathExists(path.join(process.cwd(), file))) {
        throw new Error(`Required file ${file} not found`)
      }
    }
    
    spinner.succeed('Project validation passed')
    
  } catch (error) {
    spinner.fail('Project validation failed')
    throw error
  }
}

async function startDevServer(options: DevOptions) {
  const spinner = ora('Starting development server...').start()
  
  try {
    // Set environment variables
    (process.env as any).NODE_ENV = 'development'
    
    // Prepare Next.js command
    const port = options.port || '3000'
    const host = options.host || 'localhost'
    
    const args = ['dev', '--port', port, '--hostname', host]
    
    // Add additional flags
    if (options.https) {
      args.push('--experimental-https')
    }
    
    if (options.watch !== false) {
      args.push('--watch')
    }
    
    spinner.succeed('Development server configuration ready')
    
    // Start Next.js development server
    console.log(chalk.green('✨ Starting Next.js development server...'))
    console.log(chalk.gray(`   Server: http${options.https ? 's' : ''}://${host}:${port}`))
    console.log(chalk.gray(`   Environment: development`))
    console.log()
    
    const nextProcess = spawn('npx', ['next', ...args], {
      stdio: 'inherit',
      shell: true
    })
    
    // Handle process events
    nextProcess.on('error', (error) => {
      console.error(chalk.red('❌ Failed to start Next.js:'), (error as Error).message)
      process.exit(1)
    })
    
    nextProcess.on('exit', (code) => {
      if (code !== 0) {
        console.error(chalk.red(`❌ Next.js exited with code ${code}`))
        process.exit(code)
      }
    })
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n🛑 Shutting down development server...'))
      nextProcess.kill('SIGINT')
    })
    
    process.on('SIGTERM', () => {
      console.log(chalk.yellow('\n🛑 Shutting down development server...'))
      nextProcess.kill('SIGTERM')
    })
    
  } catch (error) {
    spinner.fail('Failed to start development server')
    throw error
  }
}

// Additional development utilities
export async function devBuild(options: any) {
  console.log(chalk.blue.bold('🔨 Building FreedomPress project...'))
  
  try {
    validateEnvironment()
    
    const buildSpinner = ora('Building project...').start()
    
    // Set environment for build
    const originalEnv = process.env.NODE_ENV
    ;(process.env as any).NODE_ENV = 'production'
    
    const args = ['build']
    
    if (options.analyze) {
      args.push('--analyze')
    }
    
    if (options.debug) {
      args.push('--debug')
    }
    
    const buildProcess = spawn('npx', ['next', ...args], {
      stdio: 'inherit',
      shell: true
    })
    
    buildProcess.on('error', (error) => {
      buildSpinner.fail('Build failed')
      console.error(chalk.red('Error:'), (error as Error).message)
      process.exit(1)
    })
    
    buildProcess.on('exit', (code) => {
      if (code === 0) {
        buildSpinner.succeed('Build completed successfully')
        console.log(chalk.green('✨ Project built successfully!'))
      } else {
        buildSpinner.fail('Build failed')
        process.exit(code)
      }
    })
    
  } catch (error) {
    console.error(chalk.red('❌ Build failed:'), (error as Error).message)
    process.exit(1)
  }
}

export async function devLint(options: any) {
  console.log(chalk.blue.bold('🔍 Linting FreedomPress project...'))
  
  try {
    const spinner = ora('Running linter...').start()
    
    const args = ['lint']
    
    if (options.fix) {
      args.push('--fix')
    }
    
    if (options.strict) {
      args.push('--strict')
    }
    
    const lintProcess = spawn('npx', ['next', ...args], {
      stdio: 'inherit',
      shell: true
    })
    
    lintProcess.on('error', (error) => {
      spinner.fail('Linting failed')
      console.error(chalk.red('Error:'), (error as Error).message)
      process.exit(1)
    })
    
    lintProcess.on('exit', (code) => {
      if (code === 0) {
        spinner.succeed('Linting completed successfully')
        console.log(chalk.green('✨ No linting errors found!'))
      } else {
        spinner.fail('Linting failed')
        process.exit(code)
      }
    })
    
  } catch (error) {
    console.error(chalk.red('❌ Linting failed:'), (error as Error).message)
    process.exit(1)
  }
}