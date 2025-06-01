/**
 * @fileoverview Configuration schema and validation
 */

import * as YAML from 'yaml';
import fs from 'fs-extra';
import path from 'path';

/**
 * Default configuration template
 */
export const DEFAULT_CONFIG = {
  project: {
    rootPath: '',
    languages: [],
    framework: null,
    naturalLanguage: 'en',
    description: ''
  },
  include: [],
  exclude: [
    'node_modules',
    'vendor',
    'dist',
    'build',
    '.git',
    '.svn',
    '.hg',
    'coverage',
    'tmp',
    'temp'
  ],
  ollama: {
    model: 'llama2',
    temperature: 0.7,
    maxTokens: 512,
    baseUrl: 'http://localhost:11434'
  },
  general: {
    useGitignore: true,
    maxFileSize: 1048576, // 1MB in bytes
    followSymlinks: false,
    ignoreHidden: true
  }
};

/**
 * Configuration schema validator and loader
 */
export class ConfigSchema {
  /**
   * Validate configuration object
   * @param {Object} config - Configuration to validate
   * @returns {boolean} True if valid
   * @throws {Error} If configuration is invalid
   */
  static validate(config) {
    if (!config) {
      throw new Error('Configuration is required');
    }

    // Validate project section
    if (!config.project) {
      throw new Error('Project configuration is required');
    }

    if (!config.project.rootPath) {
      throw new Error('Project root path is required');
    }

    if (!config.project.languages || !Array.isArray(config.project.languages) || config.project.languages.length === 0) {
      throw new Error('At least one programming language must be specified');
    }

    // Validate natural language
    const validNaturalLanguages = ['en', 'fr', 'es', 'de', 'it', 'pt', 'ru', 'zh', 'ja'];
    if (config.project.naturalLanguage && !validNaturalLanguages.includes(config.project.naturalLanguage)) {
      throw new Error(`Invalid natural language: ${config.project.naturalLanguage}. Valid options: ${validNaturalLanguages.join(', ')}`);
    }

    // Validate include/exclude arrays
    if (config.include && !Array.isArray(config.include)) {
      throw new Error('Include must be an array');
    }

    if (config.exclude && !Array.isArray(config.exclude)) {
      throw new Error('Exclude must be an array');
    }

    // Validate Ollama configuration
    if (config.ollama) {
      if (config.ollama.temperature && (config.ollama.temperature < 0 || config.ollama.temperature > 2)) {
        throw new Error('Ollama temperature must be between 0 and 2');
      }

      if (config.ollama.maxTokens && (config.ollama.maxTokens < 1 || config.ollama.maxTokens > 4096)) {
        throw new Error('Ollama maxTokens must be between 1 and 4096');
      }
    }

    return true;
  }

  /**
   * Load configuration from YAML file
   * @param {string} configPath - Path to configuration file
   * @returns {Promise<Object>} Parsed configuration
   * @throws {Error} If file doesn't exist or is invalid
   */
  static async loadConfig(configPath) {
    try {
      if (!await fs.pathExists(configPath)) {
        throw new Error(`Configuration file not found: ${configPath}`);
      }

      const content = await fs.readFile(configPath, 'utf8');
      const config = YAML.parse(content);

      // Merge with defaults
      const mergedConfig = ConfigSchema.mergeWithDefaults(config);

      // Validate merged configuration
      ConfigSchema.validate(mergedConfig);

      return mergedConfig;
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error.message}`);
    }
  }

  /**
   * Save configuration to YAML file
   * @param {Object} config - Configuration to save
   * @param {string} configPath - Path to save configuration
   * @returns {Promise<void>}
   */
  static async saveConfig(config, configPath) {
    try {
      // Validate before saving
      ConfigSchema.validate(config);

      // Ensure directory exists
      await fs.ensureDir(path.dirname(configPath));

      // Convert to YAML and save
      const yamlContent = YAML.stringify(config, {
        indent: 2,
        lineWidth: 120,
        minContentWidth: 20
      });

      await fs.writeFile(configPath, yamlContent, 'utf8');
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error.message}`);
    }
  }

  /**
   * Merge configuration with defaults
   * @param {Object} config - User configuration
   * @returns {Object} Merged configuration
   */
  static mergeWithDefaults(config) {
    // Process include patterns - convert absolute paths to relative
    let processedInclude = config.include || DEFAULT_CONFIG.include;
    if (config.project && config.project.rootPath && processedInclude.length > 0) {
      processedInclude = processedInclude.map(pattern => {
        // If pattern is an absolute path within the project, make it relative
        if (path.isAbsolute(pattern) && pattern.startsWith(config.project.rootPath)) {
          const relativePath = path.relative(config.project.rootPath, pattern);
          return relativePath || '.';
        }
        return pattern;
      });
    }

    return {
      project: {
        ...DEFAULT_CONFIG.project,
        ...config.project
      },
      include: processedInclude,
      exclude: [...DEFAULT_CONFIG.exclude, ...(config.exclude || [])],
      ollama: {
        ...DEFAULT_CONFIG.ollama,
        ...config.ollama
      },
      general: {
        ...DEFAULT_CONFIG.general,
        ...config.general
      }
    };
  }

  /**
   * Create a new configuration template
   * @param {string} rootPath - Project root path
   * @param {Object} options - Additional options
   * @returns {Object} New configuration template
   */
  static createTemplate(rootPath, options = {}) {
    return {
      project: {
        rootPath: rootPath,
        languages: options.languages || ['nodejs'],
        framework: options.framework || null,
        naturalLanguage: options.naturalLanguage || 'en',
        description: options.description || ''
      },
      include: options.include || ['src', 'lib'],
      exclude: [...DEFAULT_CONFIG.exclude, ...(options.exclude || [])],
      ollama: {
        ...DEFAULT_CONFIG.ollama,
        model: options.ollamaModel || DEFAULT_CONFIG.ollama.model
      },
      general: DEFAULT_CONFIG.general
    };
  }

  /**
   * Get configuration file path relative to project
   * @param {string} projectPath - Project root path
   * @returns {string} Configuration file path
   */
  static getConfigPath(projectPath) {
    return path.join(projectPath, 'config.yml');
  }

  /**
   * Check if configuration file exists
   * @param {string} configPath - Path to configuration file
   * @returns {Promise<boolean>} True if exists
   */
  static async configExists(configPath) {
    return await fs.pathExists(configPath);
  }
}