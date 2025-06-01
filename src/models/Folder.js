import path from 'path';

/**
 * Folder model representing an indexed folder
 */
export class Folder {
    /**
     * Creates a new Folder instance
     * @param {Object} data - Folder data
     * @param {string} data.path - Folder path
     * @param {string} data.relativePath - Relative path from project root
     * @param {boolean} data.include - Whether to include this folder in indexing
     */
    constructor(data = {}) {
        this.path = data.path || '';
        this.relativePath = data.relativePath || '';
        this.include = data.include !== undefined ? data.include : true;
        this.name = path.basename(this.path);
        this.files = [];
        this.subfolders = [];
    }

    /**
     * Adds a file to this folder
     * @param {File} file - File instance to add
     */
    addFile(file) {
        this.files.push(file);
    }

    /**
     * Adds a subfolder to this folder
     * @param {Folder} folder - Folder instance to add
     */
    addSubfolder(folder) {
        this.subfolders.push(folder);
    }

    /**
     * Gets folder statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        let totalFiles = this.files.length;
        let totalSubfolders = this.subfolders.length;

        // Recursively count files and folders
        for (const subfolder of this.subfolders) {
            const subStats = subfolder.getStats();
            totalFiles += subStats.totalFiles;
            totalSubfolders += subStats.totalSubfolders;
        }

        return {
            name: this.name,
            relativePath: this.relativePath,
            totalFiles,
            totalSubfolders,
            directFiles: this.files.length,
            directSubfolders: this.subfolders.length
        };
    }

    /**
     * Checks if this folder should be excluded based on common patterns
     * @returns {boolean} True if should be excluded
     */
    shouldExclude() {
        const excludePatterns = [
            'node_modules',
            '.git',
            '.svn',
            '.hg',
            'vendor',
            'dist',
            'build',
            'coverage',
            '.nyc_output',
            'tmp',
            'temp',
            '.cache'
        ];

        return excludePatterns.some(pattern =>
            this.name === pattern || this.relativePath.includes(`/${pattern}/`)
        );
    }
}