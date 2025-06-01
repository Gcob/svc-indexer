/**
 * @fileoverview File system operations service
 */

import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import ignore from 'ignore';
import { File, FileTypes } from '../models/File.js';
import { Folder } from '../models/Folder.js';

/**
 * Service for file system operations and scanning
 */
export class FileSystemService {
    constructor() {
        this.supportedExtensions = new Set([
            'js', 'jsx', 'ts', 'tsx', 'php', 'py', 'java', 'cs', 'cpp', 'c', 'h', 'hpp',
            'rb', 'go', 'rs', 'swift', 'kt', 'html', 'css', 'scss', 'sass', 'json',
            'xml', 'yml', 'yaml', 'md', 'sql', 'sh', 'bash', 'ps1'
        ]);
    }

    /**
     * Scan directory structure
     * @param {string} rootPath - Root directory to scan
     * @param {Object} options - Scan options
     * @param {number} [options.maxDepth=10] - Maximum depth to scan
     * @param {boolean} [options.includeFiles=true] - Include files in scan
     * @param {boolean} [options.includeHidden=false] - Include hidden files/folders
     * @param {string[]} [options.excludePatterns=[]] - Patterns to exclude
     * @returns {Promise<Object>} Scan results
     */
    async scanDirectory(rootPath, options = {}) {
        const {
            maxDepth = 10,
            includeFiles = true,
            includeHidden = false,
            excludePatterns = []
        } = options;

        const ignoreFilter = ignore().add(excludePatterns);
        const rootFolder = new Folder({ path: rootPath, depth: 0 });
        const allFiles = [];
        const allFolders = [rootFolder];

        await this._scanRecursive(rootPath, rootFolder, {
            maxDepth,
            includeFiles,
            includeHidden,
            ignoreFilter,
            currentDepth: 0,
            allFiles,
            allFolders
        });

        return {
            rootFolder,
            files: allFiles,
            folders: allFolders,
            totalFiles: allFiles.length,
            totalFolders: allFolders.length,
            totalSize: allFiles.reduce((sum, file) => sum + (file.size || 0), 0)
        };
    }

    /**
     * Recursive directory scanning
     * @param {string} currentPath - Current directory path
     * @param {Folder} parentFolder - Parent folder object
     * @param {Object} options - Scan options
     * @private
     */
    async _scanRecursive(currentPath, parentFolder, options) {
        const {
            maxDepth,
            includeFiles,
            includeHidden,
            ignoreFilter,
            currentDepth,
            allFiles,
            allFolders
        } = options;

        if (currentDepth >= maxDepth) return;

        try {
            const entries = await fs.readdir(currentPath, { withFileTypes: true });

            for (const entry of entries) {
                const entryPath = path.join(currentPath, entry.name);
                const relativePath = path.relative(options.rootPath || currentPath, entryPath);

                // Skip hidden files/folders if not included
                if (!includeHidden && entry.name.startsWith('.')) continue;

                // Check ignore patterns
                if (ignoreFilter.ignores(relativePath)) continue;

                if (entry.isDirectory()) {
                    const subfolder = new Folder({
                        path: entryPath,
                        depth: currentDepth + 1
                    });

                    parentFolder.addSubfolder(subfolder);
                    allFolders.push(subfolder);

                    // Recursively scan subfolder
                    await this._scanRecursive(entryPath, subfolder, {
                        ...options,
                        currentDepth: currentDepth + 1
                    });

                } else if (entry.isFile() && includeFiles) {
                    const file = await this.createFileFromPath(entryPath);
                    if (file) {
                        parentFolder.addFile(file);
                        allFiles.push(file);
                    }
                }
            }
        } catch (error) {
            console.warn(`Warning: Unable to scan directory ${currentPath}: ${error.message}`);
        }
    }

    /**
     * Create File object from file path
     * @param {string} filePath - Path to file
     * @param {boolean} [readContent=false] - Whether to read file content
     * @returns {Promise<File|null>} File object or null if not supported
     */
    async createFileFromPath(filePath, readContent = false) {
        try {
            const stats = await fs.stat(filePath);

            // Skip very large files (> 10MB)
            if (stats.size > 10 * 1024 * 1024) return null;

            const file = new File({
                path: filePath,
                size: stats.size,
                lastModified: stats.mtime
            });

            // Auto-detect file type
            file.type = file.autoDetectType();

            // Skip unsupported file types
            if (!this.supportedExtensions.has(file.extension)) {
                // Only include if it's a known important file
                const importantFiles = ['readme', 'license', 'changelog', 'makefile', 'dockerfile'];
                if (!importantFiles.some(name => file.getName().toLowerCase().includes(name))) {
                    return null;
                }
            }

            // Read content if requested
            if (readContent) {
                try {
                    const content = await fs.readFile(filePath, 'utf8');
                    file.lineCount = content.split('\n').length;
                    file.complexity = file.calculateComplexity(content);
                    file.doc = this.extractDocumentation(content, file.language);
                    file.description = this.generateFileDescription(file, content);
                } catch (error) {
                    // File might be binary or too large
                    console.warn(`Warning: Unable to read content of ${filePath}: ${error.message}`);
                }
            } else {
                // Estimate line count from file size (rough approximation)
                file.lineCount = Math.ceil(stats.size / 50); // Assume ~50 bytes per line
            }

            return file;
        } catch (error) {
            console.warn(`Warning: Unable to process file ${filePath}: ${error.message}`);
            return null;
        }
    }

    /**
     * Extract documentation from file content
     * @param {string} content - File content
     * @param {string} language - Programming language
     * @returns {string} Extracted documentation
     */
    extractDocumentation(content, language) {
        const docPatterns = {
            javascript: [
                /\/\*\*[\s\S]*?\*\//g, // JSDoc
                /\/\*[\s\S]*?\*\//g,   // Block comments
                /\/\/.*$/gm            // Line comments
            ],
            typescript: [
                /\/\*\*[\s\S]*?\*\//g,
                /\/\*[\s\S]*?\*\//g,
                /\/\/.*$/gm
            ],
            php: [
                /\/\*\*[\s\S]*?\*\//g,
                /\/\*[\s\S]*?\*\//g,
                /\/\/.*$/gm,
                /#.*$/gm
            ],
            python: [
                /"""[\s\S]*?"""/g,     // Docstrings
                /'''[\s\S]*?'''/g,
                /#.*$/gm               // Comments
            ],
            java: [
                /\/\*\*[\s\S]*?\*\//g,
                /\/\*[\s\S]*?\*\//g,
                /\/\/.*$/gm
            ],
            csharp: [
                /\/\/\/.*$/gm,         // XML documentation
                /\/\*\*[\s\S]*?\*\//g,
                /\/\*[\s\S]*?\*\//g,
                /\/\/.*$/gm
            ]
        };

        const patterns = docPatterns[language] || docPatterns.javascript;
        const docs = [];

        patterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                docs.push(...matches);
            }
        });

        return docs.join('\n').trim();
    }

    /**
     * Generate basic file description
     * @param {File} file - File object
     * @param {string} content - File content
     * @returns {string} Generated description
     */
    generateFileDescription(file, content) {
        const fileName = file.getName().toLowerCase();
        const fileType = file.type;

        // Simple heuristics for file description
        if (fileType === FileTypes.README) {
            return 'Project documentation and information';
        }

        if (fileType === FileTypes.CONFIG) {
            return 'Configuration settings and parameters';
        }

        if (fileType === FileTypes.TEST) {
            return `Test suite for ${file.language} code`;
        }

        if (fileType === FileTypes.CONTROLLER) {
            return 'Handles HTTP requests and application flow';
        }

        if (fileType === FileTypes.SERVICE) {
            return 'Business logic and service operations';
        }

        if (fileType === FileTypes.MODEL) {
            return 'Data model and entity definitions';
        }

        if (fileType === FileTypes.COMPONENT) {
            return 'UI component and user interface logic';
        }

        if (fileType === FileTypes.UTILITY) {
            return 'Utility functions and helper methods';
        }

        // Analyze content for more specific descriptions
        if (content) {
            if (content.includes('class ') || content.includes('interface ')) {
                return `${file.language} class/interface definitions`;
            }

            if (content.includes('function ') || content.includes('def ') || content.includes('public ')) {
                return `${file.language} function implementations`;
            }

            if (content.includes('import ') || content.includes('require(') || content.includes('#include')) {
                return `${file.language} module with dependencies`;
            }
        }

        return `${file.language} source file`;
    }

    /**
     * Get file patterns using glob
     * @param {string} rootPath - Root directory
     * @param {string[]} patterns - Glob patterns
     * @param {Object} options - Glob options
     * @returns {Promise<string[]>} Array of matching file paths
     */
    async getFilesByPattern(rootPath, patterns, options = {}) {
        const allFiles = [];

        for (const pattern of patterns) {
            try {
                const files = await glob(pattern, {
                    cwd: rootPath,
                    absolute: true,
                    ignore: options.ignore || [],
                    ...options
                });
                allFiles.push(...files);
            } catch (error) {
                console.warn(`Warning: Pattern "${pattern}" failed: ${error.message}`);
            }
        }

        return [...new Set(allFiles)]; // Remove duplicates
    }

    /**
     * Check if path should be included based on patterns
     * @param {string} filePath - File path to check
     * @param {string[]} includePatterns - Include patterns
     * @param {string[]} excludePatterns - Exclude patterns
     * @returns {boolean} True if should be included
     */
    shouldIncludePath(filePath, includePatterns = [], excludePatterns = []) {
        const relativePath = filePath;

        // Check exclude patterns first
        for (const pattern of excludePatterns) {
            if (this.matchesPattern(relativePath, pattern)) {
                return false;
            }
        }

        // If no include patterns, include by default
        if (includePatterns.length === 0) return true;

        // Check include patterns
        for (const pattern of includePatterns) {
            if (this.matchesPattern(relativePath, pattern)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if path matches pattern
     * @param {string} filePath - File path
     * @param {string} pattern - Pattern to match
     * @returns {boolean} True if matches
     */
    matchesPattern(filePath, pattern) {
        // Simple pattern matching - can be enhanced with more sophisticated matching
        const regex = new RegExp(
            pattern
                .replace(/\./g, '\\.')
                .replace(/\*/g, '.*')
                .replace(/\?/g, '.'),
            'i'
        );

        return regex.test(filePath) || filePath.includes(pattern);
    }

    /**
     * Get directory size recursively
     * @param {string} dirPath - Directory path
     * @returns {Promise<number>} Size in bytes
     */
    async getDirectorySize(dirPath) {
        let totalSize = 0;

        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const entryPath = path.join(dirPath, entry.name);

                if (entry.isDirectory()) {
                    totalSize += await this.getDirectorySize(entryPath);
                } else if (entry.isFile()) {
                    const stats = await fs.stat(entryPath);
                    totalSize += stats.size;
                }
            }
        } catch (error) {
            console.warn(`Warning: Unable to calculate size for ${dirPath}: ${error.message}`);
        }

        return totalSize;
    }

    /**
     * Validate file path and permissions
     * @param {string} filePath - Path to validate
     * @returns {Promise<Object>} Validation result
     */
    async validatePath(filePath) {
        try {
            const stats = await fs.stat(filePath);
            const result = {
                exists: true,
                isFile: stats.isFile(),
                isDirectory: stats.isDirectory(),
                readable: false,
                writable: false,
                size: stats.size,
                lastModified: stats.mtime
            };

            // Check permissions
            try {
                await fs.access(filePath, fs.constants.R_OK);
                result.readable = true;
            } catch {}

            try {
                await fs.access(filePath, fs.constants.W_OK);
                result.writable = true;
            } catch {}

            return result;
        } catch (error) {
            return {
                exists: false,
                error: error.message
            };
        }
    }
}