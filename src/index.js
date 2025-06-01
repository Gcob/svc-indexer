#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { InitController } from './controllers/InitController.js';
import { ExportController } from './controllers/ExportController.js';

const program = new Command();

// CLI setup
program
    .name('svc-indexer')
    .description('A Node.js service to index programming projects and export them to markdown')
    .version('1.0.0');

// Init command
program
    .command('init')
    .description('Initialize project configuration')
    .requiredOption('-p, --path <path>', 'project root path')
    .option('-f, --force', 'overwrite existing config file without confirmation')
    .action(async (options) => {
        try {
            const controller = new InitController();
            await controller.handle(options);
        } catch (error) {
            console.error(chalk.red('✖ Error:'), error.message);
            process.exit(1);
        }
    });

// Export command
program
    .command('export')
    .description('Export project to markdown')
    .option('-c, --config <path>', 'path to config.yml file', './config.yml')
    .option('-d, --dry', 'dry run mode (display structure without creating files)')
    .option('-o, --output <path>', 'output directory', './project-exports')
    .action(async (options) => {
        try {
            const controller = new ExportController();
            await controller.handle(options);
        } catch (error) {
            console.error(chalk.red('✖ Error:'), error.message);
            process.exit(1);
        }
    });

// Help command
program
    .command('help')
    .description('display help information')
    .action(() => {
        program.help();
    });

// Parse CLI arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
    program.outputHelp();
}