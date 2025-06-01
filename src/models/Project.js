/**
 * @fileoverview Project model definition
 */

/**
 * Represents a programming project with its metadata and configuration
 */
export class Project {
    /**
     * Create a new Project instance
     * @param {Object} config - Project configuration
     * @param {string} config.rootPath - Root path of the project
     * @param {string[]} config.languages - Programming languages used in the project
     * @param {string|null} [config.framework=null] - Framework used (optional)
     * @param {string} [config.naturalLanguage='en'] - Natural language for AI descriptions
     * @param {string} [config.description=''] - Project description (optional)
     */
    constructor(config) {
        this.rootPath = config.rootPath;
        this.languages = config.languages || [];
        this.framework = config.framework || null;
        this.naturalLanguage = config.naturalLanguage || 'en';
        this.description = config.description || '';
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }

    /**
     * Validate project configuration
     * @returns {boolean} True if valid, throws error otherwise
     * @throws {Error} If configuration is invalid
     */
    validate() {
        if (!this.rootPath) {
            throw new Error('Root path is required');
        }

        if (!Array.isArray(this.languages) || this.languages.length === 0) {
            throw new Error('At least one programming language must be specified');
        }

        const validLanguages = [
            'nodejs', 'javascript', 'typescript', 'php', 'python', 'java',
            'csharp', 'cpp', 'c', 'ruby', 'go', 'rust', 'swift', 'kotlin'
        ];

        const invalidLanguages = this.languages.filter(lang => !validLanguages.includes(lang.toLowerCase()));
        if (invalidLanguages.length > 0) {
            console.warn(`Warning: Unknown languages detected: ${invalidLanguages.join(', ')}`);
        }

        const validNaturalLanguages = ['en', 'fr', 'es', 'de', 'it', 'pt', 'ru', 'zh', 'ja'];
        if (!validNaturalLanguages.includes(this.naturalLanguage)) {
            throw new Error(`Natural language '${this.naturalLanguage}' is not supported. Supported: ${validNaturalLanguages.join(', ')}`);
        }

        return true;
    }

    /**
     * Convert project to plain object for serialization
     * @returns {Object} Plain object representation
     */
    toObject() {
        return {
            rootPath: this.rootPath,
            languages: this.languages,
            framework: this.framework,
            naturalLanguage: this.naturalLanguage,
            description: this.description,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * Create Project instance from plain object
     * @param {Object} obj - Plain object representation
     * @returns {Project} New Project instance
     */
    static fromObject(obj) {
        const project = new Project(obj);
        if (obj.createdAt) project.createdAt = new Date(obj.createdAt);
        if (obj.updatedAt) project.updatedAt = new Date(obj.updatedAt);
        return project;
    }

    /**
     * Update project metadata
     * @param {Object} updates - Updates to apply
     */
    update(updates) {
        Object.assign(this, updates);
        this.updatedAt = new Date();
    }
}