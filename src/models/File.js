import path from 'path';

/**
 * File model representing an indexed file
 */
export class File {
    /**
     * Creates a new File instance
     * @param {Object} data - File data
     * @param {string} data.path - File path
     * @param {string} data.content - File content
     * @param {string} data.relativePath - Relative path from project root
     */
    constructor(data = {}) {
        this.path = data.path || '';
        this.content = data.content || '';
        this.relativePath = data.relativePath || '';
        this.type = this.determineType();
        this.extension = path.extname(this.path);
        this.name = path.basename(this.path);
        this.size = Buffer.byteLength(this.content, 'utf8');
        this.lineCount = this.content.split('\n').length;
    }

    /**
     * Determines the file type based on extension and name
     * @returns {string} File type
     */
    determineType() {
        const ext = path.extname(this.path).toLowerCase();
        const name = path.basename(this.path).toLowerCase();

        // README files
        if (name.startsWith('readme')) {
            return 'readme';
        }

        // Configuration files
        if (name.includes('config') || name.includes('settings') ||
            ['.json', '.yml', '.yaml', '.toml', '.ini'].includes(ext)) {
            return 'config';
        }

        // Test files
        if (name.includes('test') || name.includes('spec') ||
            this.path.includes('/test/') || this.path.includes('/tests/')) {
            return 'test';
        }

        // Documentation files
        if (['.md', '.txt', '.rst'].includes(ext)) {
            return 'documentation';
        }

        // Source code files
        if (['.js', '.ts', '.jsx', '.tsx', '.vue', '.svelte'].includes(ext)) {
            return 'javascript';
        }

        if (['.php', '.phtml'].includes(ext)) {
            return 'php';
        }

        if (['.py', '.pyw'].includes(ext)) {
            return 'python';
        }

        if (['.java', '.class'].includes(ext)) {
            return 'java';
        }

        if (['.c', '.cpp', '.cc', '.cxx', '.h', '.hpp'].includes(ext)) {
            return 'c_cpp';
        }

        if (['.css', '.scss', '.sass', '.less'].includes(ext)) {
            return 'stylesheet';
        }

        if (['.html', '.htm', '.xhtml'].includes(ext)) {
            return 'markup';
        }

        // Build/Package files
        if (['package.json', 'composer.json', 'requirements.txt', 'pom.xml'].includes(name)) {
            return 'package';
        }

        return 'other';
    }

    /**
     * Gets a summary of the file
     * @returns {Object} File summary
     */
    getSummary() {
        return {
            path: this.relativePath,
            name: this.name,
            type: this.type,
            extension: this.extension,
            size: this.size,
            lineCount: this.lineCount
        };
    }

    /**
     * Checks if the file is a binary file
     * @returns {boolean} True if binary file
     */
    isBinary() {
        // Simple heuristic: check for null bytes in first 1000 characters
        const sample = this.content.substring(0, 1000);
        return sample.includes('\0');
    }
}