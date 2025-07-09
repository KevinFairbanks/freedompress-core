#!/usr/bin/env node

import { Command } from 'commander'
import { initProject } from './commands/init'
import { moduleCommands } from './commands/module'
import { dbCommands } from './commands/database'
import { devCommands } from './commands/dev'

const program = new Command()

program
  .name('freedompress')
  .description('FreedomPress Core CLI - Manage your FreedomPress projects and modules')
  .version('1.0.0')

// Project initialization
program
  .command('init')
  .description('Initialize a new FreedomPress project')
  .option('-n, --name <name>', 'Project name')
  .option('-d, --directory <dir>', 'Target directory')
  .option('--skip-install', 'Skip npm install')
  .action(initProject)

// Module management commands
program
  .command('module')
  .description('Manage modules')
  .addCommand(moduleCommands)

// Database commands
program
  .command('db')
  .description('Database management')
  .addCommand(dbCommands)

// Development commands
program
  .command('dev')
  .description('Development utilities')
  .addCommand(devCommands)

// Global help
program
  .command('help')
  .description('Show help information')
  .action(() => {
    console.log(`
🚀 FreedomPress Core CLI

Available commands:
  init              Initialize a new project
  module            Manage modules (install, activate, deactivate, list)
  db                Database operations (migrate, seed, reset)
  dev               Development utilities (start, build)

Examples:
  freedompress init my-project
  freedompress module install blog
  freedompress db seed
  freedompress dev start

Use 'freedompress <command> --help' for more information about a command.
    `)
  })

program.parse()