/**
 * @fileoverview Export command controller
 */

import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs-extra';
import { ConfigSchema } from '../config/ConfigSchema.js';
import { IndexingService } from '../services/IndexingService.js';
import { ExportService } from '../services/ExportService.js';
import { AIService } from '../services/AIService.js';

/**
 * Controller for handling export commands
 */
export class ExportController {
    constructor() {
        this.indexingService = new IndexingService();
        this.exportService = new ExportService();
        this.aiService = new AIService();
    }

    /**
     * Handle the export-mindmap command
     * @param {Object} options - Command options
     */
    async handleMindmapExport(options) {
        console.log(chalk.blue.bold('\n🧠 Generating Project Mind Map\n'));

        try {
            // Load configuration
            console.log(chalk.gray(`Loading configuration from: ${options.config}`));
            const config = await ConfigSchema.loadConfig(options.config);

            // Validate project path
            if (!config.project.rootPath || config.project.rootPath.trim() === '') {
                throw new Error('Project root path is not configured. Please run "svc-indexer init" first.');
            }

            const resolvedPath = path.resolve(config.project.rootPath);
            console.log(chalk.gray(`Project path: ${resolvedPath}`));

            // Check if path exists
            if (!await fs.pathExists(resolvedPath)) {
                throw new Error(`Project path does not exist: ${resolvedPath}`);
            }

            // Log configuration details for debugging
            console.log(chalk.gray(`Include patterns: ${config.include.length} patterns`));
            console.log(chalk.gray(`Exclude patterns: ${config.exclude.length} patterns`));

            // Index project
            const spinner = ora('Indexing project structure...').start();
            try {
                const projectIndex = await this.indexingService.indexProject(config);
                spinner.succeed(`Indexed ${projectIndex.metadata.totalFiles} files in ${projectIndex.metadata.totalFolders} folders`);

                // Check if we found any files
                if (projectIndex.metadata.totalFiles === 0) {
                    console.log(chalk.yellow('⚠️  No files found to index. Check your include/exclude patterns.'));
                    console.log(chalk.cyan('Include patterns:'));
                    config.include.forEach(pattern => console.log(chalk.white(`  - ${pattern}`)));
                    return;
                }

                // Generate descriptions with AI if not dry run
                if (!options.dry) {
                    const aiSpinner = ora('Generating AI descriptions...').start();
                    try {
                        await this.aiService.enhanceProjectIndex(projectIndex, config.ollama);
                        aiSpinner.succeed('AI descriptions generated');
                    } catch (error) {
                        aiSpinner.warn(`AI enhancement failed: ${error.message}`);
                    }
                }

                // Generate mind map
                const mindmapSpinner = ora('Generating mind map...').start();
                const mindmapContent = await this.exportService.generateMindmap(
                    projectIndex,
                    {
                        format: options.format,
                        maxDepth: parseInt(options.maxDepth),
                        typesOnly: options.typesOnly ? options.typesOnly.split(',') : null
                    }
                );
                mindmapSpinner.succeed('Mind map generated');

                if (options.dry) {
                    // Display in console
                    console.log(chalk.yellow('\n📋 Mind Map Preview (Dry Run)\n'));
                    console.log(this.colorizeMarkdown(mindmapContent));
                } else {
                    // Save to file
                    const outputDir = path.resolve(options.output);
                    await fs.ensureDir(outputDir);

                    const filename = `mindmap.${options.format}`;
                    const outputPath = path.join(outputDir, filename);

                    await fs.writeFile(outputPath, mindmapContent, 'utf8');

                    console.log(chalk.green(`\n✅ Mind map exported to: ${outputPath}`));
                    this.displayMindmapStats(projectIndex);
                }
            } catch (indexError) {
                spinner.fail(`Indexing failed: ${indexError.message}`);
                throw indexError;
            }

        } catch (error) {
            throw new Error(`Mind map export failed: ${error.message}`);
        }
    }

    /**
     * Handle the export-full command
     * @param {Object} options - Command options
     */
    async handleFullExport(options) {
        console.log(chalk.blue.bold('\n📚 Generating Complete Documentation\n'));

        try {
            // Load configuration
            const config = await ConfigSchema.loadConfig(options.config);

            // Index project with detailed analysis
            const spinner = ora('Performing deep project analysis...').start();
            const projectIndex = await this.indexingService.indexProject(config, { detailed: true });
            spinner.succeed(`Analyzed ${projectIndex.totalFiles} files with detailed metadata`);

            // Generate AI descriptions and documentation
            if (!options.dry) {
                const aiSpinner = ora('Generating comprehensive AI documentation...').start();
                await this.aiService.generateDetailedDocumentation(projectIndex, config.ollama);
                aiSpinner.succeed('AI documentation generated');
            }

            // Generate exports
            const outputDir = path.resolve(options.output);
            await fs.ensureDir(outputDir);

            if (options.dry) {
                this.displayFullExportPreview(projectIndex, options);
            } else {
                await this.generateFullExports(projectIndex, outputDir, options, config);
            }

        } catch (error) {
            throw new Error(`Full export failed: ${error.message}`);
        }
    }

    /**
     * Generate all full export formats
     * @param {Object} projectIndex - Indexed project data
     * @param {string} outputDir - Output directory
     * @param {Object} options - Command options
     * @param {Object} config - Project configuration
     */
    async generateFullExports(projectIndex, outputDir, options, config) {
        const maxSizeMB = parseInt(options.maxSize);
        const maxSizeBytes = maxSizeMB * 1024 * 1024;

        // Generate markdown documentation
        const markdownSpinner = ora('Generating markdown documentation...').start();
        const markdownFiles = await this.exportService.generateFullDocumentation(
            projectIndex,
            {
                format: 'markdown',
                maxFileSize: maxSizeBytes,
                splitFiles: true
            }
        );

        // Save markdown files
        for (let i = 0; i < markdownFiles.length; i++) {
            const filename = markdownFiles.length > 1
                ? `full_documentation-${i + 1}.md`
                : 'full_documentation.md';
            await fs.writeFile(path.join(outputDir, filename), markdownFiles[i], 'utf8');
        }
        markdownSpinner.succeed(`Generated ${markdownFiles.length} markdown file(s)`);

        // Generate API specification
        const apiSpinner = ora('Generating API specification...').start();
        const apiSpec = await this.exportService.generateAPISpec(projectIndex);
        await fs.writeFile(path.join(outputDir, 'api_spec.yml'), apiSpec, 'utf8');
        apiSpinner.succeed('API specification generated');

        // Generate JSON export if requested
        if (options.json) {
            const jsonSpinner = ora('Generating JSON export...').start();
            const jsonData = await this.exportService.generateJSONExport(projectIndex);
            await fs.writeFile(path.join(outputDir, 'project_data.json'), JSON.stringify(jsonData, null, 2), 'utf8');
            jsonSpinner.succeed('JSON export generated');
        }

        // Generate PDF if requested
        if (options.pdf) {
            const pdfSpinner = ora('Generating PDF documentation...').start();
            try {
                const combinedMarkdown = markdownFiles.join('\n\n---\n\n');
                await this.exportService.generatePDF(combinedMarkdown, path.join(outputDir, 'full_documentation.pdf'));
                pdfSpinner.succeed('PDF documentation generated');
            } catch (error) {
                pdfSpinner.warn(`PDF generation failed: ${error.message}`);
            }
        }

        this.displayFullExportSummary(projectIndex, outputDir, markdownFiles.length);
    }

    /**
     * Display full export preview for dry run
     * @param {Object} projectIndex - Indexed project data
     * @param {Object} options - Command options
     */
    displayFullExportPreview(projectIndex, options) {
        console.log(chalk.yellow('\n📋 Full Export Preview (Dry Run)\n'));

        console.log(chalk.blue('📊 Project Statistics:'));
        console.log(`   Total Files: ${chalk.white(projectIndex.totalFiles)}`);
        console.log(`   Total Folders: ${chalk.white(projectIndex.totalFolders)}`);
        console.log(`   Total Size: ${chalk.white(this.formatBytes(projectIndex.totalSize))}`);
        console.log(`   Languages: ${chalk.white(projectIndex.languages.join(', '))}`);

        console.log(chalk.blue('\n📄 Files to be generated:'));
        const maxSizeBytes = parseInt(options.maxSize) * 1024 * 1024;
        const estimatedMarkdownSize = projectIndex.totalSize * 2; // Rough estimate
        const markdownFiles = Math.ceil(estimatedMarkdownSize / maxSizeBytes);

        console.log(`   ${chalk.green('✓')} ${markdownFiles} Markdown file(s) (full_documentation*.md)`);
        console.log(`   ${chalk.green('✓')} API Specification (api_spec.yml)`);

        if (options.json) {
            console.log(`   ${chalk.green('✓')} JSON Export (project_data.json)`);
        }

        if (options.pdf) {
            console.log(`   ${chalk.green('✓')} PDF Documentation (full_documentation.pdf)`);
        }

        console.log(chalk.blue('\n📁 File Type Distribution:'));
        const fileTypes = this.getFileTypeDistribution(projectIndex);
        Object.entries(fileTypes).forEach(([type, count]) => {
            console.log(`   ${type}: ${chalk.white(count)} files`);
        });
    }

    /**
     * Display full export summary
     * @param {Object} projectIndex - Indexed project data
     * @param {string} outputDir - Output directory
     * @param {number} markdownFileCount - Number of markdown files generated
     */
    displayFullExportSummary(projectIndex, outputDir, markdownFileCount) {
        console.log(chalk.green.bold('\n✅ Full Export Complete\n'));

        console.log(chalk.blue('📊 Export Statistics:'));
        console.log(`   Files Processed: ${chalk.white(projectIndex.totalFiles)}`);
        console.log(`   Folders Processed: ${chalk.white(projectIndex.totalFolders)}`);
        console.log(`   Documentation Files: ${chalk.white(markdownFileCount)}`);
        console.log(`   Total Size: ${chalk.white(this.formatBytes(projectIndex.totalSize))}`);

        console.log(chalk.blue('\n📂 Generated Files:'));
        console.log(`   ${chalk.green('📄')} ${markdownFileCount} Markdown documentation file(s)`);
        console.log(`   ${chalk.green('📋')} API specification (YAML)`);
        console.log(`   ${chalk.green('📊')} Project data (JSON)`);
        console.log(`   ${chalk.green('📖')} PDF documentation`);

        console.log(chalk.green(`\n💾 All files saved to: ${outputDir}`));

        console.log(chalk.cyan('\n🎯 Usage Tips:'));
        console.log('   • Share the markdown files with AI models for project understanding');
        console.log('   • Use the API spec for integration planning');
        console.log('   • Reference the PDF for offline documentation');
    }

    /**
     * Display mind map statistics
     * @param {Object} projectIndex - Indexed project data
     */
    displayMindmapStats(projectIndex) {
        console.log(chalk.blue('\n📊 Project Overview:'));
        console.log(`   Files: ${chalk.white(projectIndex.metadata?.totalFiles || 0)}`);
        console.log(`   Folders: ${chalk.white(projectIndex.metadata?.totalFolders || 0)}`);
        console.log(`   Languages: ${chalk.white((projectIndex.metadata?.languages || []).join(', '))}`);
        console.log(`   Total Size: ${chalk.white(this.formatBytes(projectIndex.metadata?.totalSize || 0))}`);
    }

    /**
     * Colorize markdown content for console display
     * @param {string} markdown - Markdown content
     * @returns {string} Colorized content
     */
    colorizeMarkdown(markdown) {
        return markdown
            .replace(/^# (.+)$/gm, chalk.blue.bold('# $1'))
            .replace(/^## (.+)$/gm, chalk.cyan.bold('## $1'))
            .replace(/^### (.+)$/gm, chalk.yellow.bold('### $1'))
            .replace(/^- (.+)$/gm, chalk.white('- $1'))
            .replace(/`([^`]+)`/g, chalk.green('`$1`'))
            .replace(/\*\*([^*]+)\*\*/g, chalk.bold('$1'));
    }

    /**
     * Get file type distribution
     * @param {Object} projectIndex - Indexed project data
     * @returns {Object} File type counts
     */
    getFileTypeDistribution(projectIndex) {
        const distribution = {};

        projectIndex.files.forEach(file => {
            const type = file.type || 'unknown';
            distribution[type] = (distribution[type] || 0) + 1;
        });

        return distribution;
    }

    /**
     * Format bytes to human readable string
     * @param {number} bytes - Number of bytes
     * @returns {string} Formatted string
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}