/**
 * Project model representing the indexed project structure
 */
export class Project {
    /**
     * Creates a new Project instance
     * @param {Object} data - Project data
     * @param {string} data.rootPath - Root path of the project
     * @param {string[]} data.languages - Programming languages used
     * @param {string|null} data.framework - Framework used (optional)
     * @param {string} data.naturalLanguage - Natural language for descriptions
     * @param {string} data.description - Project description (optional)
     */
    constructor(data = {}) {
        this.rootPath = data.rootPath || '';
        this.languages = data.languages || [];
        this.framework = data.framework || null;
        this.naturalLanguage = data.naturalLanguage || 'en';
        this.description = data.description || '';
        this.folders = [];
        this.files = [];
        this.createdAt = new Date().toISOString();
    }

    /**
     * Adds a folder to the project
     * @param {Folder} folder - Folder instance to add
     */
    addFolder(folder) {
        this.folders.push(folder);
    }

    /**
     * Adds a file to the project
     * @param {File} file - File instance to add
     */
    addFile(file) {
        this.files.push(file);
    }

    /**
     * Gets project statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        return {
            totalFolders: this.folders.length,
            totalFiles: this.files.length,
            languages: this.languages,
            framework: this.framework,
            createdAt: this.createdAt
        };
    }
}