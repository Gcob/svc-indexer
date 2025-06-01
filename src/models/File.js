/**
 * @fileoverview File model definition
 */

/**
 * File types enumeration
 */
export const FileTypes = {
    CLASS: 'class',
    MODULE: 'module',
    COMPONENT: 'component',
    SERVICE: 'service',
    CONTROLLER: 'controller',
    MODEL: 'model',
    UTILITY: 'utility',
    TEST: 'test',
    CONFIG: 'config',
    README: 'readme',
    DOCUMENTATION: 'documentation',
    SCRIPT: 'script',
    STYLE: 'style',
    TEMPLATE: 'template',
    DATA: 'data',
    OTHER: 'other'
};

/**
 * Represents a file in the project
 */
export class File {
    /**
     * Create a new File instance
     * @param {Object} config - File configuration
     * @param {string} config.path - File path
     * @param {string} [config.type=FileTypes.OTHER] - File type from FileTypes enum
     * @param {string} [config.description=''] - Brief description of file role
     * @param {string} [config.doc=''] - Internal documentation, JSDoc, comments
     * @param {number} [config.lineCount=0] - Number of lines in the file
     * @param {number} [config.complexity=1] - Complexity level from 1-10
     * @param {number} [config.size=0] - File size in bytes
     */
    constructor(config) {
        this.path = config.path;
        this.type = config.type || FileTypes.OTHER;
        this.description = config.description || '';
        this.doc = config.doc || '';
        this.lineCount = config.lineCount || 0;
        this.complexity = Math.max(1, Math.min(10, config.complexity || 1));
        this.size = config.size || 0;
        this.extension = this.getExtension();
        this.language = this.detectLanguage();
        this.lastModified = config.lastModified || new Date();
    }

    /**
     * Get file extension
     * @returns {string} File extension without dot
     */
    getExtension() {
        const parts = this.path.split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : '';
    }

    /**
     * Get file name without extension
     * @returns {string} File name
     */
    getName() {
        const pathParts = this.path.split('/').pop() || this.path.split('\\').pop() || this.path;
        return pathParts.split('.')[0];
    }

    /**
     * Get full file name with extension
     * @returns {string} Full file name
     */
    getFullName() {
        return this.path.split('/').pop() || this.path.split('\\').pop() || this.path;
    }

    /**
     * Detect programming language based on file extension
     * @returns {string} Detected language
     */
    detectLanguage() {
        const languageMap = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'php': 'php',
            'py': 'python',
            'java': 'java',
            'cs': 'csharp',
            'cpp': 'cpp',
            'cc': 'cpp',
            'cxx': 'cpp',
            'c': 'c',
            'h': 'c',
            'hpp': 'cpp',
            'rb': 'ruby',
            'go': 'go',
            'rs': 'rust',
            'swift': 'swift',
            'kt': 'kotlin',
            'html': 'html',
            'css': 'css',
            'scss': 'scss',
            'sass': 'sass',
            'json': 'json',
            'xml': 'xml',
            'yml': 'yaml',
            'yaml': 'yaml',
            'md': 'markdown',
            'sql': 'sql',
            'sh': 'shell',
            'bash': 'shell',
            'ps1': 'powershell'
        };

        return languageMap[this.extension] || 'unknown';
    }

    /**
     * Auto-detect file type based on path and content patterns
     * @returns {string} Detected file type
     */
    autoDetectType() {
        const fileName = this.getFullName().toLowerCase();
        const path = this.path.toLowerCase();

        // Configuration files
        if (['package.json', 'composer.json', 'pom.xml', 'build.gradle', 'makefile', 'dockerfile'].includes(fileName) ||
            fileName.includes('config') || fileName.includes('.config.') || fileName.includes('.conf')) {
            return FileTypes.CONFIG;
        }

        // Documentation
        if (fileName.includes('readme') || this.extension === 'md' || fileName.includes('doc')) {
            return FileTypes.README;
        }

        // Tests
        if (path.includes('test') || path.includes('spec') || fileName.includes('test') || fileName.includes('spec')) {
            return FileTypes.TEST;
        }

        // Controllers
        if (fileName.includes('controller') || path.includes('controller')) {
            return FileTypes.CONTROLLER;
        }

        // Services
        if (fileName.includes('service') || path.includes('service')) {
            return FileTypes.SERVICE;
        }

        // Models
        if (fileName.includes('model') || path.includes('model')) {
            return FileTypes.MODEL;
        }

        // Components (React, Vue, etc.)
        if (fileName.includes('component') || this.extension === 'vue' ||
            (this.extension === 'jsx' && !fileName.includes('test'))) {
            return FileTypes.COMPONENT;
        }

        // Utilities
        if (fileName.includes('util') || fileName.includes('helper') || path.includes('util') || path.includes('helper')) {
            return FileTypes.UTILITY;
        }

        // Styles
        if (['css', 'scss', 'sass', 'less', 'styl'].includes(this.extension)) {
            return FileTypes.STYLE;
        }

        // Templates
        if (['html', 'htm', 'hbs', 'ejs', 'pug', 'twig'].includes(this.extension)) {
            return FileTypes.TEMPLATE;
        }

        // Scripts
        if (['sh', 'bash', 'ps1', 'bat', 'cmd'].includes(this.extension)) {
            return FileTypes.SCRIPT;
        }

        // Data files
        if (['json', 'xml', 'csv', 'txt', 'data'].includes(this.extension)) {
            return FileTypes.DATA;
        }

        // Default based on language
        if (['javascript', 'typescript', 'python', 'php', 'java', 'csharp'].includes(this.language)) {
            return FileTypes.MODULE;
        }

        return FileTypes.OTHER;
    }

    /**
     * Calculate complexity score based on various factors
     * @param {string} [content=''] - File content for analysis
     * @returns {number} Complexity score from 1-10
     */
    calculateComplexity(content = '') {
        let complexity = 1;

        // Base complexity on file size
        if (this.lineCount > 500) complexity += 3;
        else if (this.lineCount > 200) complexity += 2;
        else if (this.lineCount > 100) complexity += 1;

        // Analyze content if provided
        if (content) {
            // Count cyclomatic complexity indicators
            const complexityKeywords = [
                'if', 'else', 'switch', 'case', 'for', 'while', 'do', 'foreach',
                'try', 'catch', 'finally', 'throw'
            ];

            let keywordCount = 0;
            complexityKeywords.forEach(keyword => {
                const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
                const matches = content.match(regex);
                if (matches) keywordCount += matches.length;
            });

            // Add complexity based on control flow
            if (keywordCount > 50) complexity += 3;
            else if (keywordCount > 20) complexity += 2;
            else if (keywordCount > 10) complexity += 1;

            // Check for complex patterns
            if (content.includes('async') || content.includes('await')) complexity += 1;
            if (content.includes('Promise') || content.includes('callback')) complexity += 1;
            if (content.includes('regex') || content.includes('RegExp')) complexity += 1;
        }

        return Math.max(1, Math.min(10, complexity));
    }

    /**
     * Validate file properties
     * @returns {boolean} True if valid
     * @throws {Error} If invalid
     */
    validate() {
        if (!this.path) {
            throw new Error('File path is required');
        }

        if (!Object.values(FileTypes).includes(this.type)) {
            throw new Error(`Invalid file type: ${this.type}`);
        }

        if (this.complexity < 1 || this.complexity > 10) {
            throw new Error('Complexity must be between 1 and 10');
        }

        return true;
    }

    /**
     * Convert file to plain object for serialization
     * @returns {Object} Plain object representation
     */
    toObject() {
        return {
            path: this.path,
            type: this.type,
            description: this.description,
            doc: this.doc,
            lineCount: this.lineCount,
            complexity: this.complexity,
            size: this.size,
            extension: this.extension,
            language: this.language,
            lastModified: this.lastModified
        };
    }

    /**
     * Create File instance from plain object
     * @param {Object} obj - Plain object representation
     * @returns {File} New File instance
     */
    static fromObject(obj) {
        const file = new File(obj);
        if (obj.lastModified) file.lastModified = new Date(obj.lastModified);
        return file;
    }
}