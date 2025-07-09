import { spawn } from 'child_process'
import chalk from 'chalk'
import ora from 'ora'
import fs from 'fs-extra'
import path from 'path'
import { validateEnvironment } from '../../lib/security'

interface BuildOptions {
  analyze?: boolean
  strict?: boolean
  debug?: boolean
  output?: string
  standalone?: boolean
}

export async function buildProject(options: BuildOptions) {
  console.log(chalk.blue.bold('🔨 Building FreedomPress project for production...'))
  
  try {
    // Validate environment
    validateEnvironment()
    
    // Validate project structure
    await validateProject()
    
    // Run pre-build checks
    await runPreBuildChecks()
    
    // Build the project
    await runBuild(options)
    
    // Post-build optimizations
    await runPostBuildOptimizations(options)
    
    console.log(chalk.green.bold('✅ Build completed successfully!'))
    
  } catch (error) {
    console.error(chalk.red('❌ Build failed:'), (error as Error).message)
    process.exit(1)
  }
}

async function validateProject() {
  const spinner = ora('Validating project structure...').start()
  
  try {
    // Check for required files
    const requiredFiles = [
      'package.json',
      'next.config.js',
      'tsconfig.json'
    ]
    
    for (const file of requiredFiles) {
      if (!await fs.pathExists(path.join(process.cwd(), file))) {
        throw new Error(`Required file ${file} not found`)
      }
    }
    
    // Check package.json for required dependencies
    const packageJson = await fs.readJson(path.join(process.cwd(), 'package.json'))
    
    const requiredDeps = ['next', 'react', 'react-dom']
    for (const dep of requiredDeps) {
      if (!packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]) {
        throw new Error(`Required dependency ${dep} not found`)
      }
    }
    
    spinner.succeed('Project structure validated')
    
  } catch (error) {
    spinner.fail('Project validation failed')
    throw error
  }
}

async function runPreBuildChecks() {
  const spinner = ora('Running pre-build checks...').start()
  
  try {
    // Check TypeScript compilation
    const tscProcess = spawn('npx', ['tsc', '--noEmit'], {
      stdio: 'pipe',
      shell: true
    })
    
    await new Promise((resolve, reject) => {
      tscProcess.on('exit', (code) => {
        if (code === 0) {
          resolve(undefined)
        } else {
          reject(new Error('TypeScript compilation failed'))
        }
      })
    })
    
    // Check for security vulnerabilities
    const auditProcess = spawn('npm', ['audit', '--audit-level=high'], {
      stdio: 'pipe',
      shell: true
    })
    
    await new Promise((resolve, reject) => {
      auditProcess.on('exit', (code) => {
        if (code === 0) {
          resolve(undefined)
        } else {
          spinner.warn('Security audit found issues - please review')
          resolve(undefined) // Don't fail build, just warn
        }
      })
    })
    
    spinner.succeed('Pre-build checks completed')
    
  } catch (error) {
    spinner.fail('Pre-build checks failed')
    throw error
  }
}

async function runBuild(options: BuildOptions) {
  const spinner = ora('Building Next.js application...').start()
  
  try {
    // Set environment variables
    (process.env as any).NODE_ENV = 'production'
    
    const args = ['build']
    
    if (options.analyze) {
      args.push('--analyze')
    }
    
    if (options.debug) {
      args.push('--debug')
    }
    
    if (options.standalone) {
      // Set standalone output in next.config.js
      await updateNextConfig({ standalone: true })
    }
    
    const buildProcess = spawn('npx', ['next', ...args], {
      stdio: options.debug ? 'inherit' : 'pipe',
      shell: true
    })
    
    let buildOutput = ''
    
    if (!options.debug) {
      buildProcess.stdout?.on('data', (data) => {
        buildOutput += data.toString()
      })
      
      buildProcess.stderr?.on('data', (data) => {
        buildOutput += data.toString()
      })
    }
    
    await new Promise((resolve, reject) => {
      buildProcess.on('exit', (code) => {
        if (code === 0) {
          spinner.succeed('Next.js build completed')
          resolve(undefined)
        } else {
          spinner.fail('Next.js build failed')
          if (!options.debug) {
            console.error(chalk.red('Build output:'))
            console.error(buildOutput)
          }
          reject(new Error(`Build failed with exit code ${code}`))
        }
      })
    })
    
  } catch (error) {
    spinner.fail('Build failed')
    throw error
  }
}

async function runPostBuildOptimizations(options: BuildOptions) {
  const spinner = ora('Running post-build optimizations...').start()
  
  try {
    // Create build info file
    const buildInfo = {
      timestamp: new Date().toISOString(),
      version: await getProjectVersion(),
      environment: 'production',
      options: options
    }
    
    await fs.writeJson(path.join(process.cwd(), '.next/build-info.json'), buildInfo, { spaces: 2 })
    
    // Generate deployment manifest
    await generateDeploymentManifest()
    
    // Clean up temporary files
    await cleanupTempFiles()
    
    spinner.succeed('Post-build optimizations completed')
    
  } catch (error) {
    spinner.fail('Post-build optimizations failed')
    throw error
  }
}

async function updateNextConfig(updates: any) {
  const configPath = path.join(process.cwd(), 'next.config.js')
  
  if (await fs.pathExists(configPath)) {
    let configContent = await fs.readFile(configPath, 'utf8')
    
    // Simple config updates (for more complex cases, would need proper parsing)
    if (updates.standalone) {
      if (!configContent.includes('output:')) {
        configContent = configContent.replace(
          'module.exports = nextConfig',
          `nextConfig.output = 'standalone'\n\nmodule.exports = nextConfig`
        )
      }
    }
    
    await fs.writeFile(configPath, configContent)
  }
}

async function getProjectVersion(): Promise<string> {
  try {
    const packageJson = await fs.readJson(path.join(process.cwd(), 'package.json'))
    return packageJson.version || '1.0.0'
  } catch {
    return '1.0.0'
  }
}

async function generateDeploymentManifest() {
  const manifest = {
    name: await getProjectName(),
    version: await getProjectVersion(),
    buildTime: new Date().toISOString(),
    deploymentTarget: 'docker',
    healthCheck: '/api/health',
    dependencies: await getProjectDependencies()
  }
  
  await fs.writeJson(path.join(process.cwd(), '.next/deployment-manifest.json'), manifest, { spaces: 2 })
}

async function getProjectName(): Promise<string> {
  try {
    const packageJson = await fs.readJson(path.join(process.cwd(), 'package.json'))
    return packageJson.name || 'freedompress-app'
  } catch {
    return 'freedompress-app'
  }
}

async function getProjectDependencies(): Promise<Record<string, string>> {
  try {
    const packageJson = await fs.readJson(path.join(process.cwd(), 'package.json'))
    return {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    }
  } catch {
    return {}
  }
}

async function cleanupTempFiles() {
  const tempPaths = [
    path.join(process.cwd(), '.next/cache/webpack'),
    path.join(process.cwd(), 'node_modules/.cache')
  ]
  
  for (const tempPath of tempPaths) {
    if (await fs.pathExists(tempPath)) {
      await fs.remove(tempPath)
    }
  }
}