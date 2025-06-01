/**
 * @fileoverview Project indexing service
 */

import path from 'path';
import ignore from 'ignore';
import {FileSystemService} from './FileSystemService.js';
import {GitService} from './GitService.js';
import {Project} from '../models/Project.js';

/**
 * Service for indexing programming projects
 */
export class IndexingService {
    constructor() {
        this.fileSystemService = new FileSystemService();
        this.gitService = new GitService();
    }

    /**
     * Index a complete project
     * @param {Object} config - Project configuration
     * @param {Object} options - Indexing options
     * @param {boolean} [options.detailed=false] - Perform detailed analysis
     * @param {boolean} [options.readContent=true] - Read file contents
     * @returns {Promise<Object>} Project index
     */
    async indexProject(config, options = {}) {
        const {detailed = false, readContent = true} = options;

        // Create project instance
        const project = new Project(config.project);
        project.validate();

        // Build ignore filter
        const ignoreFilter = await this.buildIgnoreFilter(config);

        // Scan project structure
        const scanOptions = {
            maxDepth: 15,
            includeFiles: true,
            includeHidden: !config.general.ignoreHidden,
            excludePatterns: config.exclude
        };

        const scanResult = await this.fileSystemService.scanDirectory(
            config.project.rootPath,
            scanOptions
        );

        // Filter based on include/exclude patterns
        const filteredFiles = this.filterFiles(scanResult.files, config, ignoreFilter);
        const filteredFolders = this.filterFolders(scanResult.folders, config, ignoreFilter);

        // Read file contents if requested
        if (readContent) {
            await this.enrichFilesWithContent(filteredFiles, detailed);
        }

        // Analyze project structure
        const analysis = this.analyzeProjectStructure(filteredFiles, filteredFolders);

        // Build final index
        const projectIndex = {
            project: project.toObject(),
            files: filteredFiles.map(file => file.toObject()),
            folders: filteredFolders.map(folder => folder.toObject()),
            structure: this.buildProjectStructure(filteredFolders, filteredFiles),
            analysis,
            metadata: {
                indexedAt: new Date(),
                totalFiles: filteredFiles.length,
                totalFolders: filteredFolders.length,
                totalSize: filteredFiles.reduce((sum, file) => sum + (file.size || 0), 0),
                languages: this.extractLanguages(filteredFiles),
                fileTypes: this.getFileTypeDistribution(filteredFiles),
                complexity: this.calculateOverallComplexity(filteredFiles)
            }
        };

        return projectIndex;
    }

    /**
     * Build ignore filter from configuration
     * @param {Object} config - Project configuration
     * @returns {Promise<Object>} Ignore filter
     */
    async buildIgnoreFilter(config) {
        const ignoreFilter = ignore();

        // Add exclude patterns from config
        ignoreFilter.add(config.exclude || []);

        // Load .gitignore if enabled
        if (config.general.useGitignore) {
            try {
                const gitignorePatterns = await this.gitService.loadGitignorePatterns(
                    config.project.rootPath
                );
                ignoreFilter.add(gitignorePatterns);
            } catch (error) {
                console.warn(`Warning: Could not load .gitignore: ${error.message}`);
            }
        }

        return ignoreFilter;
    }

    /**
     * Filter files based on include/exclude patterns
     * @param {File[]} files - Files to filter
     * @param {Object} config - Project configuration
     * @param {Object} ignoreFilter - Ignore filter
     * @returns {File[]} Filtered files
     */
    filterFiles(files, config, ignoreFilter) {
        return files.filter(file => {
            const relativePath = path.relative(config.project.rootPath, file.path);

            // Check ignore patterns
            if (ignoreFilter.ignores(relativePath)) return false;

            // Check include patterns
            if (config.include && config.include.length > 0) {
                return this.fileSystemService.shouldIncludePath(
                    relativePath,
                    config.include,
                    []
                );
            }

            return true;
        });
    }

    /**
     * Filter folders based on include/exclude patterns
     * @param {Folder[]} folders - Folders to filter
     * @param {Object} config - Project configuration
     * @param {Object} ignoreFilter - Ignore filter
     * @returns {Folder[]} Filtered folders
     */
    filterFolders(folders, config, ignoreFilter) {
        return folders.filter(folder => {
            const relativePath = path.relative(config.project.rootPath, folder.path);

            // Check ignore patterns
            if (ignoreFilter.ignores(relativePath)) {
                folder.include = false;
                return false;
            }

            // Check include patterns
            if (config.include && config.include.length > 0) {
                const shouldInclude = this.fileSystemService.shouldIncludePath(
                    relativePath,
                    config.include,
                    []
                );
                folder.include = shouldInclude;
                return shouldInclude;
            }

            folder.include = true;
            return true;
        });
    }

    /**
     * Enrich files with content analysis
     * @param {File[]} files - Files to enrich
     * @param {boolean} detailed - Perform detailed analysis
     */
    async enrichFilesWithContent(files, detailed = false) {
        const promises = files.map(async (file) => {
            try {
                const enrichedFile = await this.fileSystemService.createFileFromPath(
                    file.path,
                    true // Read content
                );

                if (enrichedFile) {
                    // Copy enriched data back to original file
                    Object.assign(file, {
                        lineCount: enrichedFile.lineCount,
                        complexity: enrichedFile.complexity,
                        doc: enrichedFile.doc,
                        description: enrichedFile.description
                    });

                    // Perform detailed analysis if requested
                    if (detailed) {
                        await this.performDetailedAnalysis(file);
                    }
                }
            } catch (error) {
                console.warn(`Warning: Could not enrich file ${file.path}: ${error.message}`);
            }
        });

        await Promise.all(promises);
    }

    /**
     * Perform detailed file analysis
     * @param {File} file - File to analyze
     */
    async performDetailedAnalysis(file) {
        try {
            const fs = await import('fs-extra');
            const content = await fs.readFile(file.path, 'utf8');

            // Enhanced complexity analysis
            file.complexity = this.calculateAdvancedComplexity(content, file.language);

            // Extract additional metadata
            file.metadata = {
                imports: this.extractImports(content, file.language),
                exports: this.extractExports(content, file.language),
                classes: this.extractClasses(content, file.language),
                functions: this.extractFunctions(content, file.language),
                dependencies: this.extractDependencies(content, file.language)
            };

        } catch (error) {
            console.warn(`Warning: Detailed analysis failed for ${file.path}: ${error.message}`);
        }
    }

    /**
     * Calculate advanced complexity score
     * @param {string} content - File content
     * @param {string} language - Programming language
     * @returns {number} Complexity score (1-10)
     */
    calculateAdvancedComplexity(content, language) {
        let complexity = 1;

        // Cyclomatic complexity
        const cyclomaticKeywords = {
            javascript: ['if', 'else', 'switch', 'case', 'for', 'while', 'do', 'try', 'catch', '&&', '||', '?'],
            python: ['if', 'elif', 'else', 'for', 'while', 'try', 'except', 'and', 'or'],
            java: ['if', 'else', 'switch', 'case', 'for', 'while', 'do', 'try', 'catch', '&&', '||', '?'],
            php: ['if', 'else', 'switch', 'case', 'for', 'while', 'do', 'try', 'catch', '&&', '||', '?']
        };

        const keywords = cyclomaticKeywords[language] || cyclomaticKeywords.javascript;
        let keywordCount = 0;

        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            const matches = content.match(regex);
            if (matches) keywordCount += matches.length;
        });

        // Base complexity on control flow
        if (keywordCount > 100) complexity += 4;
        else if (keywordCount > 50) complexity += 3;
        else if (keywordCount > 20) complexity += 2;
        else if (keywordCount > 10) complexity += 1;

        // Nesting level (approximate)
        const nestingLevel = this.calculateNestingLevel(content);
        if (nestingLevel > 5) complexity += 2;
        else if (nestingLevel > 3) complexity += 1;

        // Lines of code
        const lines = content.split('\n').length;
        if (lines > 1000) complexity += 3;
        else if (lines > 500) complexity += 2;
        else if (lines > 200) complexity += 1;

        // Language-specific patterns
        if (content.includes('async') || content.includes('await')) complexity += 1;
        if (content.includes('Promise') || content.includes('callback')) complexity += 1;
        if (content.includes('regex') || content.includes('RegExp')) complexity += 1;

        return Math.max(1, Math.min(10, complexity));
    }

    /**
     * Calculate approximate nesting level
     * @param {string} content - File content
     * @returns {number} Maximum nesting level
     */
    calculateNestingLevel(content) {
        let maxLevel = 0;
        let currentLevel = 0;

        for (const char of content) {
            if (char === '{') {
                currentLevel++;
                maxLevel = Math.max(maxLevel, currentLevel);
            } else if (char === '}') {
                currentLevel = Math.max(0, currentLevel - 1);
            }
        }

        return maxLevel;
    }

    /**
     * Extract imports from file content
     * @param {string} content - File content
     * @param {string} language - Programming language
     * @returns {string[]} Array of imports
     */
    extractImports(content, language) {
        const importPatterns = {
            javascript: [
                /import\s+.*\s+from\s+['"]([^'"]+)['"]/g,
                /require\(['"]([^'"]+)['"]\)/g
            ],
            python: [
                /import\s+([^\s]+)/g,
                /from\s+([^\s]+)\s+import/g
            ],
            java: [
                /import\s+([^;]+);/g
            ],
            php: [
                /use\s+([^;]+);/g,
                /require_once\s+['"]([^'"]+)['"]/g
            ]
        };

        const patterns = importPatterns[language] || importPatterns.javascript;
        const imports = [];

        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                imports.push(match[1]);
            }
        });

        return [...new Set(imports)];
    }

    /**
     * Extract exports from file content
     * @param {string} content - File content
     * @param {string} language - Programming language
     * @returns {string[]} Array of exports
     */
    extractExports(content, language) {
        const exportPatterns = {
            javascript: [
                /export\s+(?:default\s+)?(?:class|function|const|let|var)\s+([^\s(]+)/g,
                /export\s*{\s*([^}]+)\s*}/g
            ],
            python: [
                /def\s+([^\s(]+)/g,
                /class\s+([^\s(:]+)/g
            ]
        };

        const patterns = exportPatterns[language] || exportPatterns.javascript;
        const exports = [];

        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                if (match[1].includes(',')) {
                    exports.push(...match[1].split(',').map(e => e.trim()));
                } else {
                    exports.push(match[1]);
                }
            }
        });

        return [...new Set(exports)];
    }

    /**
     * Extract classes from file content
     * @param {string} content - File content
     * @param {string} language - Programming language
     * @returns {string[]} Array of class names
     */
    extractClasses(content, language) {
        const classPatterns = {
            javascript: /class\s+([^\s{]+)/g,
            python: /class\s+([^\s(:]+)/g,
            java: /class\s+([^\s{]+)/g,
            php: /class\s+([^\s{]+)/g,
            csharp: /class\s+([^\s{]+)/g
        };

        const pattern = classPatterns[language];
        if (!pattern) return [];

        const classes = [];
        let match;
        while ((match = pattern.exec(content)) !== null) {
            classes.push(match[1]);
        }

        return classes;
    }

    /**
     * Extract functions from file content
     * @param {string} content - File content
     * @param {string} language - Programming language
     * @returns {string[]} Array of function names
     */
    extractFunctions(content, language) {
        const functionPatterns = {
            javascript: [
                /function\s+([^\s(]+)/g,
                /const\s+([^\s=]+)\s*=\s*(?:async\s+)?\(/g,
                /([^\s=]+)\s*:\s*(?:async\s+)?function/g
            ],
            python: [
                /def\s+([^\s(]+)/g
            ],
            java: [
                /(?:public|private|protected)?\s*(?:static\s+)?[^\s]+\s+([^\s(]+)\s*\(/g
            ],
            php: [
                /function\s+([^\s(]+)/g
            ]
        };

        const patterns = functionPatterns[language] || functionPatterns.javascript;
        const functions = [];

        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                functions.push(match[1]);
            }
        });

        return [...new Set(functions)];
    }

    /**
     * Extract dependencies from file content
     * @param {string} content - File content
     * @param {string} language - Programming language
     * @returns {string[]} Array of dependencies
     */
    extractDependencies(content, language) {
        // This is a simplified version - could be enhanced with package.json parsing, etc.
        return this.extractImports(content, language)
            .filter(imp => !imp.startsWith('.') && !imp.startsWith('/'));
    }

    /**
     * Analyze project structure
     * @param {File[]} files - Project files
     * @param {Folder[]} folders - Project folders
     * @returns {Object} Structure analysis
     */
    analyzeProjectStructure(files, folders) {
        return {
            architecture: this.detectArchitecturePattern(folders),
            frameworks: this.detectFrameworks(files),
            patterns: this.detectDesignPatterns(files),
            testCoverage: this.calculateTestCoverage(files),
            documentation: this.analyzeDocumentation(files),
            dependencies: this.analyzeDependencies(files)
        };
    }
}
