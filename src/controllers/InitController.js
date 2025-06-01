/**
 * @fileoverview Init command controller
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs-extra';
import { ConfigSchema } from '../config/ConfigSchema.js';
import { FileSystemService } from '../services/FileSystemService.js';
import { GitService } from '../services/GitService.js';

/**
 * Controller for handling project initialization
 */
export class InitController {
    constructor() {
        this.fileSystemService = new FileSystemService();
        this.gitService = new GitService();
    }

    /**
     * Handle the init command
     * @param {Object} options - Command options
     * @param {string} options.path - Project root path
     * @param {boolean} [options.force=false] - Force overwrite existing config
     */
    async handleInit(options) {
        console.log(chalk.blue.bold('\n🚀 Initializing SVC Indexer Configuration\n'));

        // Validate project path
        const projectPath = path.resolve(options.path);
        if (!await fs.pathExists(projectPath)) {
            throw new Error(`Project path does not exist: ${projectPath}`);
        }

        const configPath = ConfigSchema.getConfigPath(projectPath);
        const configExists = await ConfigSchema.configExists(configPath);

        // Handle existing configuration
        if (configExists && !options.force) {
            const { action } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'action',
                    message: 'Configuration file already exists. What would you like to do?',
                    choices: [
                        { name: 'Modify existing configuration', value: 'modify' },
                        { name: 'Recreate configuration', value: 'recreate' },
                        { name: 'Cancel', value: 'cancel' }
                    ]
                }
            ]);

            if (action === 'cancel') {
                console.log(chalk.yellow('🚫 Configuration initialization cancelled.'));
                return;
            }

            if (action === 'modify') {
                return await this.modifyExistingConfig(configPath);
            }
        }

        // Create new configuration
        await this.createNewConfig(projectPath, configPath);
    }

    /**
     * Create a new configuration
     * @param {string} projectPath - Project root path
     * @param {string} configPath - Configuration file path
     */
    async createNewConfig(projectPath, configPath) {
        console.log(chalk.cyan('📋 Creating new configuration...\n'));

        // Scan project structure
        const spinner = ora('Scanning project structure...').start();
        const projectStructure = await this.fileSystemService.scanDirectory(projectPath, {
            maxDepth: 2,
            includeFiles: false
        });
        spinner.succeed('Project structure scanned');

        // Load .gitignore if exists
        let gitignorePatterns = [];
        if (await fs.pathExists(path.join(projectPath, '.gitignore'))) {
            gitignorePatterns = await this.gitService.loadGitignorePatterns(projectPath);
            console.log(chalk.green(`✓ Loaded ${gitignorePatterns.length} patterns from .gitignore`));
        }

        // Interactive configuration
        const config = await this.gatherConfigurationData(projectPath, projectStructure, gitignorePatterns);

        // Save configuration
        const saveSpinner = ora('Saving configuration...').start();
        await ConfigSchema.saveConfig(config, configPath);
        saveSpinner.succeed('Configuration saved');

        // Display summary
        this.displayConfigurationSummary(config, configPath);
    }

    /**
     * Modify existing configuration
     * @param {string} configPath - Configuration file path
     */
    async modifyExistingConfig(configPath) {
        console.log(chalk.cyan('✏️  Modifying existing configuration...\n'));

        const config = await ConfigSchema.loadConfig(configPath);

        const { sections } = await inquirer.prompt([
            {
                type: 'checkbox',
                name: 'sections',
                message: 'Which sections would you like to modify?',
                choices: [
                    { name: 'Project Information', value: 'project' },
                    { name: 'Include/Exclude Patterns', value: 'patterns' },
                    { name: 'Ollama Settings', value: 'ollama' },
                    { name: 'General Settings', value: 'general' }
                ]
            }
        ]);

        let updatedConfig = { ...config };

        for (const section of sections) {
            switch (section) {
                case 'project':
                    updatedConfig.project = await this.gatherProjectInfo(config.project);
                    break;
                case 'patterns':
                    const patterns = await this.gatherIncludeExcludePatterns(
                        config.project.rootPath,
                        config.include,
                        config.exclude
                    );
                    updatedConfig.include = patterns.include;
                    updatedConfig.exclude = patterns.exclude;
                    break;
                case 'ollama':
                    updatedConfig.ollama = await this.gatherOllamaSettings(config.ollama);
                    break;
                case 'general':
                    updatedConfig.general = await this.gatherGeneralSettings(config.general);
                    break;
            }
        }

        // Save updated configuration
        const spinner = ora('Updating configuration...').start();
        await ConfigSchema.saveConfig(updatedConfig, configPath);
        spinner.succeed('Configuration updated');

        this.displayConfigurationSummary(updatedConfig, configPath);
    }

    /**
     * Gather configuration data through interactive prompts
     * @param {string} projectPath - Project root path
     * @param {Object} projectStructure - Scanned project structure
     * @param {string[]} gitignorePatterns - Gitignore patterns
     * @returns {Promise<Object>} Configuration object
     */
    async gatherConfigurationData(projectPath, projectStructure, gitignorePatterns) {
        // Project information
        const projectInfo = await this.gatherProjectInfo();
        projectInfo.rootPath = projectPath;

        // Include/Exclude patterns
        const patterns = await this.gatherIncludeExcludePatterns(
            projectPath,
            projectStructure.folders,
            gitignorePatterns
        );

        // Ollama settings
        const ollamaSettings = await this.gatherOllamaSettings();

        // General settings
        const generalSettings = await this.gatherGeneralSettings();

        return {
            project: projectInfo,
            include: patterns.include,
            exclude: patterns.exclude,
            ollama: ollamaSettings,
            general: generalSettings
        };
    }

    /**
     * Gather project information
     * @param {Object} [existing] - Existing project configuration
     * @returns {Promise<Object>} Project information
     */
    async gatherProjectInfo(existing = {}) {
        console.log(chalk.yellow('📋 Project Information'));

        return await inquirer.prompt([
            {
                type: 'checkbox',
                name: 'languages',
                message: 'Select programming languages used in this project:',
                choices: [
                    'nodejs', 'javascript', 'typescript', 'php', 'python',
                    'java', 'csharp', 'cpp', 'c', 'ruby', 'go', 'rust'
                ],
                default: existing.languages || ['nodejs'],
                validate: (input) => input.length > 0 || 'At least one language must be selected'
            },
            {
                type: 'input',
                name: 'framework',
                message: 'Framework (optional):',
                default: existing.framework || ''
            },
            {
                type: 'list',
                name: 'naturalLanguage',
                message: 'Natural language for AI descriptions:',
                choices: [
                    { name: 'English', value: 'en' },
                    { name: 'French', value: 'fr' },
                    { name: 'Spanish', value: 'es' },
                    { name: 'German', value: 'de' }
                ],
                default: existing.naturalLanguage || 'en'
            },
            {
                type: 'input',
                name: 'description',
                message: 'Project description (optional):',
                default: existing.description || ''
            }
        ]);
    }

    /**
     * Gather include/exclude patterns
     * @param {string} projectPath - Project root path
     * @param {string[]|Object[]} folders - Available folders or existing include patterns
     * @param {string[]} gitignorePatterns - Gitignore patterns or existing exclude patterns
     * @returns {Promise<Object>} Include/exclude patterns
     */
    async gatherIncludeExcludePatterns(projectPath, folders, gitignorePatterns) {
        console.log(chalk.yellow('\n📁 Folder Selection'));

        // If folders is an array of strings, it's existing include patterns
        if (Array.isArray(folders) && folders.length > 0 && typeof folders[0] === 'string') {
            const { include, exclude } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'include',
                    message: 'Include patterns (comma-separated):',
                    default: folders.join(', '),
                    filter: (input) => input.split(',').map(s => s.trim()).filter(s => s)
                },
                {
                    type: 'input',
                    name: 'exclude',
                    message: 'Exclude patterns (comma-separated):',
                    default: gitignorePatterns.join(', '),
                    filter: (input) => input.split(',').map(s => s.trim()).filter(s => s)
                }
            ]);
            return { include, exclude };
        }

        // Get folder choices from scanned structure
        const folderChoices = (folders || []).map(folder => ({
            name: folder.path,
            value: folder.path,
            checked: !gitignorePatterns.some(pattern => folder.path.includes(pattern))
        }));

        const { includeFolders } = await inquirer.prompt([
            {
                type: 'checkbox',
                name: 'includeFolders',
                message: 'Select folders to include in indexing:',
                choices: folderChoices,
                pageSize: 15
            }
        ]);

        const exclude = [...gitignorePatterns];

        return {
            include: includeFolders,
            exclude
        };
    }

    /**
     * Gather Ollama settings
     * @param {Object} [existing] - Existing Ollama configuration
     * @returns {Promise<Object>} Ollama settings
     */
    async gatherOllamaSettings(existing = {}) {
        console.log(chalk.yellow('\n🤖 Ollama Configuration'));

        return await inquirer.prompt([
            {
                type: 'input',
                name: 'model',
                message: 'Ollama model name:',
                default: existing.model || 'llama2'
            },
            {
                type: 'number',
                name: 'temperature',
                message: 'Temperature (0-2):',
                default: existing.temperature || 0.7,
                validate: (input) => (input >= 0 && input <= 2) || 'Temperature must be between 0 and 2'
            },
            {
                type: 'number',
                name: 'maxTokens',
                message: 'Max tokens:',
                default: existing.maxTokens || 512,
                validate: (input) => (input > 0 && input <= 4096) || 'Max tokens must be between 1 and 4096'
            },
            {
                type: 'input',
                name: 'baseUrl',
                message: 'Ollama base URL:',
                default: existing.baseUrl || 'http://localhost:11434'
            }
        ]);
    }

    /**
     * Gather general settings
     * @param {Object} [existing] - Existing general configuration
     * @returns {Promise<Object>} General settings
     */
    async gatherGeneralSettings(existing = {}) {
        console.log(chalk.yellow('\n⚙️  General Settings'));

        return await inquirer.prompt([
            {
                type: 'confirm',
                name: 'useGitignore',
                message: 'Use .gitignore patterns for exclusion?',
                default: existing.useGitignore !== undefined ? existing.useGitignore : true
            },
            {
                type: 'confirm',
                name: 'ignoreHidden',
                message: 'Ignore hidden files and folders?',
                default: existing.ignoreHidden !== undefined ? existing.ignoreHidden : true
            },
            {
                type: 'confirm',
                name: 'followSymlinks',
                message: 'Follow symbolic links?',
                default: existing.followSymlinks !== undefined ? existing.followSymlinks : false
            }
        ]);
    }

    /**
     * Display configuration summary
     * @param {Object} config - Configuration object
     * @param {string} configPath - Configuration file path
     */
    displayConfigurationSummary(config, configPath) {
        console.log(chalk.green.bold('\n✅ Configuration Summary\n'));

        console.log(chalk.blue('📂 Project:'));
        console.log(`   Path: ${chalk.white(config.project.rootPath)}`);
        console.log(`   Languages: ${chalk.white(config.project.languages.join(', '))}`);
        if (config.project.framework) {
            console.log(`   Framework: ${chalk.white(config.project.framework)}`);
        }
        console.log(`   Natural Language: ${chalk.white(config.project.naturalLanguage)}`);

        console.log(chalk.blue('\n📁 Patterns:'));
        console.log(`   Include: ${chalk.green(config.include.join(', '))}`);
        console.log(`   Exclude: ${chalk.red(config.exclude.slice(0, 5).join(', '))}${config.exclude.length > 5 ? '...' : ''}`);

        console.log(chalk.blue('\n🤖 Ollama:'));
        console.log(`   Model: ${chalk.white(config.ollama.model)}`);
        console.log(`   Temperature: ${chalk.white(config.ollama.temperature)}`);

        console.log(chalk.green(`\n💾 Configuration saved to: ${configPath}`));
        console.log(chalk.cyan('\n🚀 Next steps:'));
        console.log('   • Run `svc-indexer export-mindmap` to generate a mind map');
        console.log('   • Run `svc-indexer export-full` to generate complete documentation');
    }
}