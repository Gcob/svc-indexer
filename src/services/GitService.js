/**
 * @fileoverview Git operations service
 */

import fs from 'fs-extra';
import path from 'path';

/**
 * Service for Git-related operations
 */
export class GitService {
    /**
     * Load .gitignore patterns from project root
     * @param {string} projectPath - Path to project root
     * @returns {Promise<string[]>} Array of gitignore patterns
     */
    async loadGitignorePatterns(projectPath) {
        const gitignorePath = path.join(projectPath, '.gitignore');

        try {
            if (!await fs.pathExists(gitignorePath)) {
                return [];
            }

            const content = await fs.readFile(gitignorePath, 'utf8');

            return this.parseGitignoreContent(content);
        } catch (error) {
            console.warn(`Warning: Could not read .gitignore: ${error.message}`);
            return [];
        }
    }

    /**
     * Parse .gitignore file content
     * @param {string} content - .gitignore file content
     * @returns {string[]} Array of patterns
     */
    parseGitignoreContent(content) {
        return content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#')) // Remove empty lines and comments
            .map(line => this.normalizeGitignorePattern(line));
    }

    /**
     * Normalize gitignore pattern for use with ignore library
     * @param {string} pattern - Original pattern
     * @returns {string} Normalized pattern
     */
    normalizeGitignorePattern(pattern) {
        // Remove trailing slash for directories
        if (pattern.endsWith('/')) {
            return pattern.slice(0, -1);
        }

        return pattern;
    }

    /**
     * Check if project is a Git repository
     * @param {string} projectPath - Path to project root
     * @returns {Promise<boolean>} True if it's a Git repository
     */
    async isGitRepository(projectPath) {
        const gitPath = path.join(projectPath, '.git');

        try {
            const stats = await fs.stat(gitPath);
            return stats.isDirectory();
        } catch (error) {
            return false;
        }
    }

    /**
     * Get Git repository information
     * @param {string} projectPath - Path to project root
     * @returns {Promise<Object|null>} Repository information or null
     */
    async getRepositoryInfo(projectPath) {
        if (!await this.isGitRepository(projectPath)) {
            return null;
        }

        try {
            const configPath = path.join(projectPath, '.git', 'config');

            if (!await fs.pathExists(configPath)) {
                return { isRepository: true };
            }

            const configContent = await fs.readFile(configPath, 'utf8');
            const remoteUrl = this.extractRemoteUrl(configContent);

            return {
                isRepository: true,
                remoteUrl,
                hasRemote: !!remoteUrl
            };
        } catch (error) {
            console.warn(`Warning: Could not read Git config: ${error.message}`);
            return { isRepository: true };
        }
    }

    /**
     * Extract remote URL from Git config
     * @param {string} configContent - Git config file content
     * @returns {string|null} Remote URL or null
     */
    extractRemoteUrl(configContent) {
        const urlMatch = configContent.match(/url\s*=\s*(.+)/);
        return urlMatch ? urlMatch[1].trim() : null;
    }

    /**
     * Get common gitignore patterns for specific languages/frameworks
     * @param {string[]} languages - Programming languages
     * @param {string} framework - Framework name
     * @returns {string[]} Recommended gitignore patterns
     */
    getRecommendedGitignorePatterns(languages = [], framework = null) {
        const patterns = new Set([
            // Common patterns
            '.DS_Store',
            'Thumbs.db',
            '*.log',
            '*.tmp',
            '*.temp',
            '.env',
            '.env.local',
            '.env.*.local'
        ]);

        // Language-specific patterns
        languages.forEach(lang => {
            const langPatterns = this.getLanguageGitignorePatterns(lang);
            langPatterns.forEach(pattern => patterns.add(pattern));
        });

        // Framework-specific patterns
        if (framework) {
            const frameworkPatterns = this.getFrameworkGitignorePatterns(framework);
            frameworkPatterns.forEach(pattern => patterns.add(pattern));
        }

        return Array.from(patterns);
    }

    /**
     * Get gitignore patterns for specific programming language
     * @param {string} language - Programming language
     * @returns {string[]} Language-specific patterns
     */
    getLanguageGitignorePatterns(language) {
        const patterns = {
            javascript: [
                'node_modules/',
                'npm-debug.log*',
                'yarn-debug.log*',
                'yarn-error.log*',
                '.npm',
                '.yarn-integrity',
                'dist/',
                'build/'
            ],
            typescript: [
                'node_modules/',
                'dist/',
                'build/',
                '*.tsbuildinfo',
                '.tscache/'
            ],
            python: [
                '__pycache__/',
                '*.py[cod]',
                '*$py.class',
                'venv/',
                'env/',
                '.Python',
                'pip-log.txt',
                'pip-delete-this-directory.txt',
                '.pytest_cache/',
                'htmlcov/'
            ],
            java: [
                '*.class',
                '*.jar',
                '*.war',
                '*.ear',
                'target/',
                '.gradle/',
                'build/',
                '.mvn/'
            ],
            php: [
                'vendor/',
                'composer.lock',
                '.env',
                'storage/logs/',
                'storage/framework/cache/',
                'storage/framework/sessions/',
                'storage/framework/views/'
            ],
            csharp: [
                'bin/',
                'obj/',
                '*.user',
                '*.suo',
                '*.userosscache',
                '*.sln.docstates',
                '.vs/',
                'packages/',
                '*.nupkg'
            ],
            cpp: [
                '*.o',
                '*.obj',
                '*.exe',
                '*.dll',
                '*.so',
                '*.dylib',
                'build/',
                'cmake-build-*/',
                '.vscode/'
            ],
            go: [
                '*.exe',
                '*.exe~',
                '*.dll',
                '*.so',
                '*.dylib',
                'vendor/',
                '.glide/'
            ],
            rust: [
                'target/',
                'Cargo.lock',
                '*.pdb'
            ]
        };

        return patterns[language.toLowerCase()] || [];
    }

    /**
     * Get gitignore patterns for specific framework
     * @param {string} framework - Framework name
     * @returns {string[]} Framework-specific patterns
     */
    getFrameworkGitignorePatterns(framework) {
        const patterns = {
            react: [
                'build/',
                '.env.local',
                '.env.development.local',
                '.env.test.local',
                '.env.production.local'
            ],
            vue: [
                'dist/',
                '.nuxt/',
                '.output/',
                '.vuepress/dist'
            ],
            angular: [
                'dist/',
                '.angular/',
                'e2e/',
                '.ng_pkg_build/'
            ],
            laravel: [
                'vendor/',
                'storage/logs/',
                'storage/framework/cache/',
                'storage/framework/sessions/',
                'storage/framework/views/',
                'bootstrap/cache/',
                '.env'
            ],
            django: [
                '*.pyc',
                '__pycache__/',
                'db.sqlite3',
                'media/',
                'staticfiles/',
                '.env'
            ],
            spring: [
                'target/',
                '.gradle/',
                'build/',
                '.mvn/',
                'mvnw',
                'mvnw.cmd'
            ],
            express: [
                'node_modules/',
                'uploads/',
                'logs/',
                '.env'
            ]
        };

        return patterns[framework.toLowerCase()] || [];
    }

    /**
     * Generate .gitignore content based on project configuration
     * @param {string[]} languages - Programming languages
     * @param {string} framework - Framework name
     * @param {string[]} additionalPatterns - Additional custom patterns
     * @returns {string} Generated .gitignore content
     */
    generateGitignoreContent(languages = [], framework = null, additionalPatterns = []) {
        const allPatterns = [
            '# Generated by SVC Indexer',
            '',
            '# General',
            ...this.getRecommendedGitignorePatterns(languages, framework),
            '',
            '# Project specific',
            'project-exports/',
            'project-configs/',
            '',
            '# Additional patterns'
        ];

        if (additionalPatterns.length > 0) {
            allPatterns.push(...additionalPatterns);
        }

        return allPatterns.join('\n') + '\n';
    }

    /**
     * Create or update .gitignore file
     * @param {string} projectPath - Path to project root
     * @param {string[]} languages - Programming languages
     * @param {string} framework - Framework name
     * @param {Object} options - Options
     * @param {boolean} [options.backup=true] - Create backup of existing file
     * @param {boolean} [options.merge=true] - Merge with existing patterns
     * @returns {Promise<void>}
     */
    async createOrUpdateGitignore(projectPath, languages, framework, options = {}) {
        const { backup = true, merge = true } = options;
        const gitignorePath = path.join(projectPath, '.gitignore');

        try {
            let existingPatterns = [];

            // Read existing .gitignore if it exists and merge is enabled
            if (merge && await fs.pathExists(gitignorePath)) {
                const existingContent = await fs.readFile(gitignorePath, 'utf8');
                existingPatterns = this.parseGitignoreContent(existingContent);

                // Create backup if requested
                if (backup) {
                    const backupPath = gitignorePath + '.backup';
                    await fs.copy(gitignorePath, backupPath);
                    console.log(`Backup created: ${backupPath}`);
                }
            }

            // Generate new patterns
            const recommendedPatterns = this.getRecommendedGitignorePatterns(languages, framework);

            // Merge patterns (remove duplicates)
            const allPatterns = [...new Set([...existingPatterns, ...recommendedPatterns])];

            // Generate new content
            const newContent = this.generateGitignoreContent(languages, framework, allPatterns);

            // Write to file
            await fs.writeFile(gitignorePath, newContent, 'utf8');

            console.log(`Updated .gitignore with ${allPatterns.length} patterns`);
        } catch (error) {
            throw new Error(`Failed to update .gitignore: ${error.message}`);
        }
    }

    /**
     * Validate gitignore patterns
     * @param {string[]} patterns - Patterns to validate
     * @returns {Object} Validation result
     */
    validateGitignorePatterns(patterns) {
        const result = {
            valid: [],
            invalid: [],
            warnings: []
        };

        patterns.forEach(pattern => {
            if (!pattern || pattern.trim() === '') {
                result.invalid.push({ pattern, reason: 'Empty pattern' });
                return;
            }

            const trimmed = pattern.trim();

            // Check for common mistakes
            if (trimmed.includes(' ') && !trimmed.startsWith('"')) {
                result.warnings.push({ pattern, reason: 'Pattern contains spaces, consider quoting' });
            }

            if (trimmed.includes('\\') && process.platform !== 'win32') {
                result.warnings.push({ pattern, reason: 'Backslashes may not work on non-Windows systems' });
            }

            if (trimmed.startsWith('/') && trimmed.length === 1) {
                result.invalid.push({ pattern, reason: 'Invalid root pattern' });
                return;
            }

            result.valid.push(trimmed);
        });

        return result;
    }

    /**
     * Get Git branch information
     * @param {string} projectPath - Path to project root
     * @returns {Promise<Object|null>} Branch information or null
     */
    async getBranchInfo(projectPath) {
        if (!await this.isGitRepository(projectPath)) {
            return null;
        }

        try {
            const headPath = path.join(projectPath, '.git', 'HEAD');

            if (!await fs.pathExists(headPath)) {
                return null;
            }

            const headContent = await fs.readFile(headPath, 'utf8').then(content => content.trim());

            // Parse HEAD content
            if (headContent.startsWith('ref: refs/heads/')) {
                const branchName = headContent.replace('ref: refs/heads/', '');
                return {
                    currentBranch: branchName,
                    isDetached: false
                };
            } else {
                // Detached HEAD
                return {
                    currentBranch: headContent.substring(0, 7), // Short hash
                    isDetached: true
                };
            }
        } catch (error) {
            console.warn(`Warning: Could not read Git HEAD: ${error.message}`);
            return null;
        }
    }

    /**
     * Check if file/path is ignored by Git
     * @param {string} projectPath - Path to project root
     * @param {string} filePath - File path to check
     * @returns {Promise<boolean>} True if ignored
     */
    async isIgnored(projectPath, filePath) {
        try {
            const gitignorePatterns = await this.loadGitignorePatterns(projectPath);
            const relativePath = path.relative(projectPath, filePath);

            return gitignorePatterns.some(pattern => {
                return this.matchesGitignorePattern(relativePath, pattern);
            });
        } catch (error) {
            console.warn(`Warning: Could not check ignore status: ${error.message}`);
            return false;
        }
    }

    /**
     * Check if path matches gitignore pattern
     * @param {string} filePath - File path
     * @param {string} pattern - Gitignore pattern
     * @returns {boolean} True if matches
     */
    matchesGitignorePattern(filePath, pattern) {
        // Simplified gitignore pattern matching
        // For more complex matching, consider using a dedicated library like 'ignore'

        if (pattern.includes('*')) {
            const regex = new RegExp(
                '^' + pattern
                    .replace(/\./g, '\\.')
                    .replace(/\*/g, '.*')
                    .replace(/\?/g, '.')
        );
            return regex.test(filePath);
        }

        if (pattern.endsWith('/')) {
            // Directory pattern
            return filePath.startsWith(pattern.slice(0, -1)) || filePath === pattern.slice(0, -1);
        }

        return filePath === pattern || filePath.startsWith(pattern + '/');
    }

    // todo : validate this file
}
