import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { Config } from '../models/Config.js';
import { FileUtils } from '../utils/FileUtils.js';

/**
 * Service for handling configuration files
 */
export class ConfigService {
    /**
     * Creates a new ConfigService instance
     */
    constructor() {
        this.defaultConfigPath = 'config.yml';
    }

    /**
     * Loads configuration from a YAML file
     * @param {string} configPath - Path to the config file
     * @returns {Promise<Config>} Configuration object
     * @throws {Error} If config file doesn't exist or is invalid
     */
    async load(configPath = this.defaultConfigPath) {
        try {
            const configData = await fs.readFile(configPath, 'utf8');
            const parsedData = yaml.load(configData);

            const config = Config.fromObject(parsedData);
            const validation = config.validate();

            if (!validation.isValid) {
                throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
            }

            return config;
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`Configuration file not found: ${configPath}`);
            }
            throw error;
        }
    }

    /**
     * Saves configuration to a YAML file
     * @param {Config} config - Configuration object to save
     * @param {string} configPath - Path where to save the config file
     * @returns {Promise<void>}
     */
    async save(config, configPath = this.defaultConfigPath) {
        const validation = config.validate();

        if (!validation.isValid) {
            throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
        }

        const yamlContent = yaml.dump(config.toObject(), {
            indent: 2,
            lineWidth: 120,
            noRefs: true
        });

        await fs.writeFile(configPath, yamlContent, 'utf8');
    }

    /**
     * Checks if a configuration file exists
     * @param {string} configPath - Path to check
     * @returns {Promise<boolean>} True if file exists
     */
    async exists(configPath = this.defaultConfigPath) {
        try {
            await fs.access(configPath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Creates a default configuration for a project
     * @param {string} projectPath - Root path of the project
     * @returns {Promise<Config>} Default configuration
     */
    async createDefault(projectPath) {
        const absolutePath = path.resolve(projectPath);

        // Check if path exists
        if (!(await FileUtils.exists(absolutePath))) {
            throw new Error(`Project path does not exist: ${absolutePath}`);
        }

        // Detect languages based on files in the project
        const languages = await this.detectLanguages(absolutePath);

        // Create default exclude list
        const exclude = [
            'node_modules',
            'vendor',
            'dist',
            'build',
            '.git',
            '.svn',
            'coverage',
            '.nyc_output',
            'tmp',
            'temp',
            '.cache'
        ];

        return new Config({
            project: {
                rootPath: absolutePath,
                languages,
                framework: null,
                naturalLanguage: 'en'
            },
            exclude
        });
    }

    /**
     * Detects programming languages in a project
     * @param {string} projectPath - Path to analyze
     * @returns {Promise<string[]>} Array of detected languages
     */
    async detectLanguages(projectPath) {
        const languages = new Set();
        const languageMap = {
            '.js': 'javascript',
            '.ts': 'typescript',
            '.jsx': 'javascript',
            '.tsx': 'typescript',
            '.vue': 'javascript',
            '.php': 'php',
            '.py': 'python',
            '.java': 'java',
            '.c': 'c',
            '.cpp': 'cpp',
            '.cs': 'csharp',
            '.rb': 'ruby',
            '.go': 'go',
            '.rs': 'rust',
            '.swift': 'swift',
            '.kt': 'kotlin'
        };

        try {
            const files = await FileUtils.getFilesRecursive(projectPath, { maxDepth: 3 });

            for (const file of files) {
                const ext = path.extname(file).toLowerCase();
                if (languageMap[ext]) {
                    languages.add(languageMap[ext]);
                }
            }
        } catch (error) {
            console.warn('Warning: Could not detect languages automatically');
        }

        return Array.from(languages).sort();
    }
}