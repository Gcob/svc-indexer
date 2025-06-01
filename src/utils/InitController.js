import inquirer from 'inquirer';
import chalk from 'chalk';
import path from 'path';
import { ConfigService } from '../services/ConfigService.js';
import { Logger } from '../utils/Logger.js';

/**
 * Controller for handling initialization commands
 */
export class InitController {
  /**
   * Creates a new InitController instance
   */
  constructor() {
    this.configService = new ConfigService();
  }

  /**
   * Handles the init command
   * @param {Object} options - Command options
   * @param {string} options.path - Project root path
   * @param {boolean} options.force - Force overwrite existing config
   */
  async handle(options) {
    Logger.section('Project Initialization');

    const projectPath = path.resolve(options.path);
    const configPath = path.join(process.cwd(), 'config.yml');

    Logger.info(`Initializing project: ${chalk.cyan(projectPath)}`);

    // Check if config already exists
    const configExists = await this.configService.exists(configPath);

    if (configExists && !options.force) {
      const { shouldOverwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'shouldOverwrite',
          message: 'Configuration file already exists. Overwrite it?',
          default: false
        }
      ]);

      if (!shouldOverwrite) {
        Logger.info('Initialization cancelled');
        return;
      }
    }

    try {
      // Create default configuration
      Logger.info('Analyzing project structure...');
      const defaultConfig = await this.configService.createDefault(projectPath);

      // Interactive configuration
      const config = await this.promptForConfiguration(defaultConfig);

      // Save configuration
      Logger.info('Saving configuration...');
      await this.configService.save(config, configPath);

      Logger.success(`Configuration saved to: ${chalk.cyan(configPath)}`);
      Logger.info('\nNext steps:');
      Logger.info(`  1. Review and customize ${chalk.cyan('config.yml')} if needed`);
      Logger.info(`  2. Run ${chalk.cyan('svc-indexer export')} to generate project documentation`);

    } catch (error) {
      Logger.error(`Failed to initialize project: ${error.message}`);
      throw error;
    }
  }

  /**
   * Interactive prompt for configuration options
   * @param {Config} defaultConfig - Default configuration
   * @returns {Promise<Config>} Configured project
   */
  async promptForConfiguration(defaultConfig) {
    Logger.subsection('Project Configuration');

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'description',
        message: 'Project description (optional):',
        default: ''
      },
      {
        type: 'checkbox',
        name: 'languages',
        message: 'Select programming languages used in this project:',
        choices: [
          { name: 'JavaScript', value: 'javascript', checked: defaultConfig.project.languages.includes('javascript') },
          { name: 'TypeScript', value: 'typescript', checked: defaultConfig.project.languages.includes('typescript') },
          { name: 'PHP', value: 'php', checked: defaultConfig.project.languages.includes('php') },
          { name: 'Python', value: 'python', checked: defaultConfig.project.languages.includes('python') },
          { name: 'Java', value: 'java', checked: defaultConfig.project.languages.includes('java') },
          { name: 'C/C++', value: 'cpp', checked: defaultConfig.project.languages.includes('cpp') },
          { name: 'C#', value: 'csharp', checked: defaultConfig.project.languages.includes('csharp') },
          { name: 'Ruby', value: 'ruby', checked: defaultConfig.project.languages.includes('ruby') },
          { name: 'Go', value: 'go', checked: defaultConfig.project.languages.includes('go') },
          { name: 'Rust', value: 'rust', checked: defaultConfig.project.languages.includes('rust') }
        ],
        validate: (input) => {
          if (input.length === 0) {
            return 'Please select at least one programming language';
          }
          return true;
        }
      },
      {
        type: 'input',
        name: 'framework',
        message: 'Framework used (optional):',
        default: defaultConfig.project.framework || ''
      },
      {
        type: 'list',
        name: 'naturalLanguage',
        message: 'Natural language for documentation:',
        choices: [
          { name: 'English', value: 'en' },
          { name: 'French', value: 'fr' },
          { name: 'Spanish', value: 'es' },
          { name: 'German', value: 'de' }
        ],
        default: defaultConfig.project.naturalLanguage
      },
      {
        type: 'checkbox',
        name: 'additionalExcludes',
        message: 'Additional folders to exclude (default excludes are already applied):',
        choices: [
          { name: 'tests/', value: 'tests' },
          { name: 'docs/', value: 'docs' },
          { name: 'examples/', value: 'examples' },
          { name: 'assets/', value: 'assets' },
          { name: 'public/', value: 'public' },
          { name: 'storage/', value: 'storage' }
        ]
      }
    ]);

    // Update configuration with user input
    defaultConfig.project.description = answers.description;
    defaultConfig.project.languages = answers.languages;
    defaultConfig.project.framework = answers.framework || null;
    defaultConfig.project.naturalLanguage = answers.naturalLanguage;

    // Add additional excludes
    if (answers.additionalExcludes && answers.additionalExcludes.length > 0) {
      defaultConfig.exclude = [...defaultConfig.exclude, ...answers.additionalExcludes];
    }

    // Show configuration summary
    Logger.subsection('Configuration Summary');
    Logger.info(`Root Path: ${chalk.cyan(defaultConfig.project.rootPath)}`);
    Logger.info(`Languages: ${chalk.cyan(defaultConfig.project.languages.join(', '))}`);
    if (defaultConfig.project.framework) {
      Logger.info(`Framework: ${chalk.cyan(defaultConfig.project.framework)}`);
    }
    Logger.info(`Natural Language: ${chalk.cyan(defaultConfig.project.naturalLanguage)}`);
    Logger.info(`Excluded Folders: ${chalk.cyan(defaultConfig.exclude.join(', '))}`);

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Save this configuration?',
        default: true
      }
    ]);

    if (!confirm) {
      throw new Error('Configuration cancelled by user');
    }

    return defaultConfig;
  }
}