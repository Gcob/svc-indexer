/**
 * @fileoverview File utility functions
 */

import fs from 'fs-extra';
import path from 'path';
import { logger } from './Logger.js';

/**
 * Utility functions for file operations
 */
export class FileUtils {
    /**
     * Ensure directory exists, create if not
     * @param {string} dirPath - Directory path
     * @returns {Promise<void>}
     */
    static async ensureDirectory(dirPath) {
        try {
            await fs.ensureDir(dirPath);
            logger.debug(`Directory ensured: ${dirPath}`);
        } catch (error) {
            logger.error(`Failed to ensure directory: ${dirPath}`, error);
            throw error;
        }
    }

    /**
     * Check if path exists and is accessible
     * @param {string} filePath - File path to check
     * @returns {Promise<boolean>} True if exists and accessible
     */
    static async pathExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get file size in bytes
     * @param {string} filePath - File path
     * @returns {Promise<number>} File size in bytes
     */
    static async getFileSize(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return stats.size;
        } catch (error) {
            logger.warn(`Could not get file size for: ${filePath}`);
            return 0;
        }
    }

    /**
     * Read file content safely
     * @param {string} filePath - File path
     * @param {string} [encoding='utf8'] - File encoding
     * @returns {Promise<string|null>} File content or null if failed
     */
    static async readFileSafe(filePath, encoding = 'utf8') {
        try {
            return await fs.readFile(filePath, encoding);
        } catch (error) {
            logger.warn(`Could not read file: ${filePath} - ${error.message}`);
            return null;
        }
    }

    /**
     * Write file safely with backup
     * @param {string} filePath - File path
     * @param {string} content - Content to write
     * @param {Object} options - Write options
     * @param {boolean} [options.backup=false] - Create backup before writing
     * @returns {Promise<void>}
     */
    static async writeFileSafe(filePath, content, options = {}) {
        const { backup = false } = options;

        try {
            // Create backup if requested and file exists
            if (backup && await FileUtils.pathExists(filePath)) {
                const backupPath = `${filePath}.backup`;
                await fs.copy(filePath, backupPath);
                logger.debug(`Backup created: ${backupPath}`);
            }

            // Ensure directory exists
            await FileUtils.ensureDirectory(path.dirname(filePath));

            // Write file
            await fs.writeFile(filePath, content, 'utf8');
            logger.debug(`File written: ${filePath}`);
        } catch (error) {
            logger.error(`Failed to write file: ${filePath}`, error);
            throw error;
        }
    }

    /**
     * Copy file or directory
     * @param {string} src - Source path
     * @param {string} dest - Destination path
     * @param {Object} options - Copy options
     * @returns {Promise<void>}
     */
    static async copy(src, dest, options = {}) {
        try {
            await fs.copy(src, dest, options);
            logger.debug(`Copied: ${src} -> ${dest}`);
        } catch (error) {
            logger.error(`Failed to copy: ${src} -> ${dest}`, error);
            throw error;
        }
    }

    /**
     * Remove file or directory
     * @param {string} filePath - Path to remove
     * @returns {Promise<void>}
     */
    static async remove(filePath) {
        try {
            await fs.remove(filePath);
            logger.debug(`Removed: ${filePath}`);
        } catch (error) {
            logger.error(`Failed to remove: ${filePath}`, error);
            throw error;
        }
    }

    /**
     * Get relative path from base to target
     * @param {string} basePath - Base path
     * @param {string} targetPath - Target path
     * @returns {string} Relative path
     */
    static getRelativePath(basePath, targetPath) {
        return path.relative(basePath, targetPath);
    }

    /**
     * Normalize path separators
     * @param {string} filePath - File path
     * @returns {string} Normalized path
     */
    static normalizePath(filePath) {
        return path.normalize(filePath).replace(/\\/g, '/');
    }

    /**
     * Get file extension
     * @param {string} filePath - File path
     * @returns {string} File extension without dot
     */
    static getExtension(filePath) {
        return path.extname(filePath).slice(1).toLowerCase();
    }

    /**
     * Get filename without extension
     * @param {string} filePath - File path
     * @returns {string} Filename without extension
     */
    static getBasename(filePath) {
        return path.basename(filePath, path.extname(filePath));
    }

    /**
     * Check if file is text-based
     * @param {string} filePath - File path
     * @returns {boolean} True if likely text file
     */
    static isTextFile(filePath) {
        const textExtensions = [
            'txt', 'md', 'js', 'jsx', 'ts', 'tsx', 'json', 'xml', 'html', 'css',
            'scss', 'sass', 'php', 'py', 'java', 'cs', 'cpp', 'c', 'h', 'rb',
            'go', 'rs', 'swift', 'kt', 'yml', 'yaml', 'sql', 'sh', 'bash'
        ];

        const ext = FileUtils.getExtension(filePath);
        return textExtensions.includes(ext);
    }

    /**
     * Check if file is binary
     * @param {string} filePath - File path
     * @returns {boolean} True if likely binary file
     */
    static isBinaryFile(filePath) {
        const binaryExtensions = [
            'exe', 'dll', 'so', 'dylib', 'bin', 'pdf', 'doc', 'docx', 'xls',
            'xlsx', 'ppt', 'pptx', 'zip', 'tar', 'gz', 'rar', 'jpg', 'jpeg',
            'png', 'gif', 'bmp', 'svg', 'mp3', 'mp4', 'avi', 'mov', 'wmv'
        ];

        const ext = FileUtils.getExtension(filePath);
        return binaryExtensions.includes(ext);
    }

    /**
     * Format file size to human readable string
     * @param {number} bytes - Size in bytes
     * @returns {string} Formatted size string
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 B';

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Get temporary file path
     * @param {string} [prefix='svc-indexer'] - File prefix
     * @param {string} [extension='tmp'] - File extension
     * @returns {string} Temporary file path
     */
    static getTempPath(prefix = 'svc-indexer', extension = 'tmp') {
        const tmpDir = require('os').tmpdir();
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2);
        const filename = `${prefix}-${timestamp}-${random}.${extension}`;
        return path.join(tmpDir, filename);
    }

    /**
     * Clean up temporary files
     * @param {string[]} tempPaths - Array of temporary file paths
     * @returns {Promise<void>}
     */
    static async cleanupTempFiles(tempPaths) {
        const cleanupPromises = tempPaths.map(async (tempPath) => {
            try {
                if (await FileUtils.pathExists(tempPath)) {
                    await FileUtils.remove(tempPath);
                }
            } catch (error) {
                logger.warn(`Failed to cleanup temp file: ${tempPath}`);
            }
        });

        await Promise.allSettled(cleanupPromises);
    }

    /**
     * Walk directory recursively
     * @param {string} dirPath - Directory to walk
     * @param {Function} callback - Callback function for each file/directory
     * @param {Object} options - Walk options
     * @param {boolean} [options.includeDirectories=false] - Include directories in callback
     * @param {number} [options.maxDepth=Infinity] - Maximum depth to walk
     * @returns {Promise<void>}
     */
    static async walkDirectory(dirPath, callback, options = {}) {
        const { includeDirectories = false, maxDepth = Infinity } = options;

        async function walk(currentPath, depth = 0) {
            if (depth > maxDepth) return;

            try {
                const entries = await fs.readdir(currentPath, { withFileTypes: true });

                for (const entry of entries) {
                    const entryPath = path.join(currentPath, entry.name);

                    if (entry.isDirectory()) {
                        if (includeDirectories) {
                            await callback(entryPath, entry, depth);
                        }
                        await walk(entryPath, depth + 1);
                    } else if (entry.isFile()) {
                        await callback(entryPath, entry, depth);
                    }
                }
            } catch (error) {
                logger.warn(`Could not read directory: ${currentPath} - ${error.message}`);
            }
        }

        await walk(dirPath);
    }

    /**
     * Find files matching pattern
     * @param {string} dirPath - Directory to search
     * @param {string|RegExp} pattern - Pattern to match
     * @param {Object} options - Search options
     * @returns {Promise<string[]>} Array of matching file paths
     */
    static async findFiles(dirPath, pattern, options = {}) {
        const matchingFiles = [];
        const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'i');

        await FileUtils.walkDirectory(dirPath, async (filePath, entry) => {
            if (entry.isFile() && regex.test(entry.name)) {
                matchingFiles.push(filePath);
            }
        }, options);

        return matchingFiles;
    }
}