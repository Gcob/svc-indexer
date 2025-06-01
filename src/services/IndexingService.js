import fs from 'fs/promises';
import path from 'path';
import { Project } from '../models/Project.js';
import { Folder } from '../models/Folder.js';
import { File } from '../models/File.js';
import { FileUtils } from '../utils/FileUtils.js';

/**
 * Service for indexing project files and folders
 */
export class IndexingService {
    /**
     * Creates a new IndexingService instance
     */
    constructor() {
        this.maxFileSize = 1024 * 1024; // 1MB max file size
        this.binaryExtensions = new Set([
            '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.ico',
            '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
            '.zip', '.rar', '.7z', '.tar', '.gz', '.exe', '.dll', '.so',
            '.bin', '.img', '.iso', '.dmg', '.app'
        ]);
    }

    /**
     * Indexes a project based on configuration
     * @param {Config} config - Project configuration
     * @returns {Promise<Project>} Indexed project
     */
    async indexProject(config) {
        const project = new Project({
            rootPath: config.project.rootPath,
            languages: config.project.languages,
            framework: config.project.framework,
            naturalLanguage: config.project.naturalLanguage
        });

        const rootPath = path.resolve(config.project.rootPath);

        // Check if root path exists
        if (!(await FileUtils.exists(rootPath))) {
            throw new Error(`Project root path does not exist: ${rootPath}`);
        }

        await this.indexDirectory(rootPath, rootPath, config.exclude, project);

        return project;
    }

    /**
     * Recursively indexes a directory
     * @param {string} dirPath - Directory path to index
     * @param {string} rootPath - Project root path
     * @param {string[]} excludePatterns - Patterns to exclude
     * @param {Project} project - Project instance to populate
     * @param {number} depth - Current recursion depth
     * @returns {Promise<Folder>} Indexed folder
     */
    async indexDirectory(dirPath, rootPath, excludePatterns, project, depth = 0) {
        const relativePath = path.relative(rootPath, dirPath);
        const folder = new Folder({
            path: dirPath,
            relativePath: relativePath || '.',
            include: true
        });

        // Check if this folder should be excluded
        if (this.shouldExcludeFolder(relativePath, excludePatterns)) {
            folder.include = false;
            return folder;
        }

        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const entryPath = path.join(dirPath, entry.name);
                const entryRelativePath = path.relative(rootPath, entryPath);

                if (entry.isDirectory()) {
                    // Skip excluded directories
                    if (this.shouldExcludeFolder(entryRelativePath, excludePatterns)) {
                        continue;
                    }

                    const subfolder = await this.indexDirectory(
                        entryPath,
                        rootPath,
                        excludePatterns,
                        project,
                        depth + 1
                    );

                    folder.addSubfolder(subfolder);
                    project.addFolder(subfolder);
                } else if (entry.isFile()) {
                    // Skip excluded files
                    if (this.shouldExcludeFile(entry.name, entryRelativePath)) {
                        continue;
                    }

                    try {
                        const file = await this.indexFile(entryPath, rootPath);
                        folder.addFile(file);
                        project.addFile(file);
                    } catch (error) {
                        console.warn(`Warning: Could not index file ${entryPath}: ${error.message}`);
                    }
                }
            }
        } catch (error) {
            console.warn(`Warning: Could not read directory ${dirPath}: ${error.message}`);
        }

        return folder;
    }

    /**
     * Indexes a single file
     * @param {string} filePath - File path to index
     * @param {string} rootPath - Project root path
     * @returns {Promise<File>} Indexed file
     */
    async indexFile(filePath, rootPath) {
        const stats = await fs.stat(filePath);

        // Skip large files
        if (stats.size > this.maxFileSize) {
            throw new Error(`File too large: ${stats.size} bytes`);
        }

        const relativePath = path.relative(rootPath, filePath);
        const extension = path.extname(filePath).toLowerCase();

        // Skip binary files
        if (this.binaryExtensions.has(extension)) {
            return new File({
                path: filePath,
                relativePath,
                content: '[Binary file - content not indexed]'
            });
        }

        let content;
        try {
            content = await fs.readFile(filePath, 'utf8');
        } catch (error) {
            // If we can't read as UTF8, it's probably binary
            content = '[Binary or unreadable file - content not indexed]';
        }

        return new File({
            path: filePath,
            relativePath,
            content
        });
    }

    /**
     * Checks if a folder should be excluded
     * @param {string} relativePath - Relative path of the folder
     * @param {string[]} excludePatterns - Exclude patterns
     * @returns {boolean} True if should be excluded
     */
    shouldExcludeFolder(relativePath, excludePatterns) {
        if (!relativePath || relativePath === '.') {
            return false;
        }

        const pathParts = relativePath.split(path.sep);

        return excludePatterns.some(pattern => {
            // Exact match
            if (pathParts.includes(pattern)) {
                return true;
            }

            // Pattern matching (simple glob-like)
            if (pattern.includes('*')) {
                const regex = new RegExp(pattern.replace(/\*/g, '.*'));
                return regex.test(relativePath);
            }

            return false;
        });
    }

    /**
     * Checks if a file should be excluded
     * @param {string} fileName - File name
     * @param {string} relativePath - Relative path of the file
     * @returns {boolean} True if should be excluded
     */
    shouldExcludeFile(fileName, relativePath) {
        // Skip hidden files (starting with .)
        if (fileName.startsWith('.') && fileName !== '.gitignore' && fileName !== '.env.example') {
            return true;
        }

        // Skip common temporary/cache files
        const excludePatterns = [
            '.DS_Store',
            'Thumbs.db',
            '*.tmp',
            '*.log',
            '*.cache'
        ];

        return excludePatterns.some(pattern => {
            if (pattern.includes('*')) {
                const regex = new RegExp(pattern.replace(/\*/g, '.*'));
                return regex.test(fileName);
            }
            return fileName === pattern;
        });
    }
}