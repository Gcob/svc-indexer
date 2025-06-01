#!/usr/bin/env node

/**
 * @fileoverview Main entry point for the SVC Indexer CLI tool
 * @author Developer
 * @version 1.0.0
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { InitController } from './controllers/InitController.js';
import { ExportController } from './controllers/ExportController.js';

const program = new Command();

/**
 * Main application setup
 */
function setupCLI() {
    program
        .name('svc-indexer')
        .description('A Node.js service to index programming projects with Ollama AI integration')
        .version('1.0.0');

    // Init command
    program
        .command('init')
        .description('Initialize project configuration')
        .requiredOption('-p, --path <path>', 'Root path of the project to index')
        .option('-f, --force', 'Overwrite existing config file without confirmation')
        .action(async (options) => {
            try {
                const controller = new InitController();
                await controller.handleInit(options);
            } catch (error) {
                console.error(chalk.red(`✖ Error during initialization: ${error.message}`));
                process.exit(1);
            }
        });

    // Export mindmap command
    program
        .command('export-mindmap')
        .description('Export project structure as a mind map')
        .option('-c, --config <path>', 'Path to config.yml file', './config.yml')
        .option('-d, --dry', 'Dry run mode - display structure without creating files')
        .option('-o, --output <folder>', 'Output folder for exports', './project-exports')
        .option('--format <format>', 'Output format: markdown, mermaid, dot', 'markdown')
        .option('--max-depth <n>', 'Maximum depth to display', '10')
        .option('--types-only <types>', 'Filter by file types (comma-separated)')
        .action(async (options) => {
            try {
                const controller = new ExportController();
                await controller.handleMindmapExport(options);
            } catch (error) {
                console.error(chalk.red(`✖ Error during mindmap export: ${error.message}`));
                process.exit(1);
            }
        });

    // Export full command
    program
        .command('export-full')
        .description('Export complete project documentation')
        .option('-c, --config <path>', 'Path to config.yml file', './config.yml')
        .option('-d, --dry', 'Dry run mode - display summary without creating files')
        .option('-f, --force', 'Overwrite existing exports')
        .option('-p, --pdf', 'Generate PDF output', true)
        .option('-o, --output <folder>', 'Output folder for exports', './project-exports')
        .option('--json', 'Generate JSON output in addition to markdown')
        .option('--max-size <mb>', 'Maximum size per markdown file in MB', '10')
        .action(async (options) => {
            try {
                const controller = new ExportController();
                await controller.handleFullExport(options);
            } catch (error) {
                console.error(chalk.red(`✖ Error during full export: ${error.message}`));
                process.exit(1);
            }
        });

    // Global error handler
    program.exitOverride();

    program.parse();
}

// Display welcome message
console.log(chalk.blue.bold('🚀 SVC Indexer - Project Documentation Generator'));
console.log(chalk.gray('A Node.js service to index programming projects with Ollama AI integration\n'));

// Initialize CLI
setupCLI();