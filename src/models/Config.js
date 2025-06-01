/**
 * Configuration model for the project indexer
 */
export class Config {
    /**
     * Creates a new Config instance
     * @param {Object} data - Configuration data
     * @param {Object} data.project - Project configuration
     * @param {string} data.project.rootPath - Root path of the project
     * @param {string[]} data.project.languages - Programming languages used
     * @param {string|null} data.project.framework - Framework used (optional)
     * @param {string} data.project.naturalLanguage - Natural language for descriptions
     * @param {string[]} data.exclude - Folders to exclude from indexing
     */
    constructor(data = {}) {
        this.project = {
            rootPath: data.project?.rootPath || '',
            languages: data.project?.languages || [],
            framework: data.project?.framework || null,
            naturalLanguage: data.project?.naturalLanguage || 'en'
        };

        this.exclude = data.exclude || [];
    }

    /**
     * Validates the configuration
     * @returns {Object} Validation result with isValid boolean and errors array
     */
    validate() {
        const errors = [];

        if (!this.project.rootPath) {
            errors.push('Project root path is required');
        }

        if (!this.project.languages || this.project.languages.length === 0) {
            errors.push('At least one programming language must be specified');
        }

        if (!this.project.naturalLanguage) {
            errors.push('Natural language must be specified');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Converts the config to a plain object for serialization
     * @returns {Object} Plain object representation
     */
    toObject() {
        return {
            project: {
                rootPath: this.project.rootPath,
                languages: this.project.languages,
                framework: this.project.framework,
                naturalLanguage: this.project.naturalLanguage
            },
            exclude: this.exclude
        };
    }

    /**
     * Creates a Config instance from a plain object
     * @param {Object} data - Configuration data
     * @returns {Config} New Config instance
     */
    static fromObject(data) {
        return new Config(data);
    }
}