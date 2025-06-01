/**
 * @fileoverview Export service for generating documentation
 */

import path from 'path';
import fs from 'fs-extra';
import markdownPdf from 'markdown-pdf';
import * as YAML from 'yaml';

/**
 * Service for exporting project documentation in various formats
 */
export class ExportService {
    constructor() {
        this.maxFileSize = 10 * 1024 * 1024; // 10MB default
    }

    /**
     * Generate mind map in specified format
     * @param {Object} projectIndex - Project index object
     * @param {Object} options - Export options
     * @param {string} [options.format='markdown'] - Output format (markdown, mermaid, dot)
     * @param {number} [options.maxDepth=10] - Maximum depth to display
     * @param {string[]} [options.typesOnly] - Filter by file types
     * @returns {Promise<string>} Generated mind map content
     */
    async generateMindmap(projectIndex, options = {}) {
        const { format = 'markdown', maxDepth = 10, typesOnly = null } = options;

        // Filter files if type filter is specified
        let files = projectIndex.files;
        if (typesOnly && typesOnly.length > 0) {
            files = files.filter(file => typesOnly.includes(file.type));
        }

        switch (format.toLowerCase()) {
            case 'mermaid':
                return this.generateMermaidMindmap(projectIndex, files, maxDepth);
            case 'dot':
                return this.generateDotMindmap(projectIndex, files, maxDepth);
            case 'markdown':
            default:
                return this.generateMarkdownMindmap(projectIndex, files, maxDepth);
        }
    }

    /**
     * Generate markdown mind map
     * @param {Object} projectIndex - Project index object
     * @param {Array} files - Filtered files
     * @param {number} maxDepth - Maximum depth
     * @returns {string} Markdown content
     */
    generateMarkdownMindmap(projectIndex, files, maxDepth) {
        const project = projectIndex.project;
        const structure = projectIndex.structure;

        let markdown = `# Mind Map: ${project.description || 'Project Documentation'}\n\n`;

        // Project overview
        markdown += `## Project Overview\n\n`;
        markdown += `- **Languages**: ${projectIndex.metadata.languages.join(', ')}\n`;
        markdown += `- **Total Files**: ${projectIndex.metadata.totalFiles}\n`;
        markdown += `- **Total Size**: ${this.formatBytes(projectIndex.metadata.totalSize)}\n`;

        if (projectIndex.analysis.frameworks.length > 0) {
            markdown += `- **Frameworks**: ${projectIndex.analysis.frameworks.join(', ')}\n`;
        }

        if (projectIndex.analysis.architecture.length > 0) {
            markdown += `- **Architecture**: ${projectIndex.analysis.architecture.join(', ')}\n`;
        }

        markdown += '\n## Project Structure\n\n';

        // Generate structure recursively
        markdown += this.buildMarkdownStructure(structure, 0, maxDepth);

        // File type summary
        markdown += '\n## File Type Distribution\n\n';
        Object.entries(projectIndex.metadata.fileTypes).forEach(([type, count]) => {
            markdown += `- **${type}**: ${count} files\n`;
        });

        // Complexity overview
        if (projectIndex.metadata.complexity) {
            markdown += '\n## Complexity Overview\n\n';
            markdown += `- **Average Complexity**: ${projectIndex.metadata.complexity.average}/10\n`;
            markdown += `- **Most Complex**: ${projectIndex.metadata.complexity.max}/10\n`;
            markdown += `- **Least Complex**: ${projectIndex.metadata.complexity.min}/10\n`;
        }

        return markdown;
    }

    /**
     * Build markdown structure recursively
     * @param {Object} node - Structure node
     * @param {number} depth - Current depth
     * @param {number} maxDepth - Maximum depth
     * @returns {string} Markdown content
     */
    buildMarkdownStructure(node, depth, maxDepth) {
        if (depth >= maxDepth) return '';

        const indent = '  '.repeat(depth);
        let content = '';

        if (node.type === 'folder') {
            content += `${indent}- **${node.name}/** — ${node.description || 'Folder'}\n`;

            if (node.children) {
                node.children.forEach(child => {
                    content += this.buildMarkdownStructure(child, depth + 1, maxDepth);
                });
            }
        } else if (node.type === 'file') {
            const icon = this.getFileIcon(node.fileType, node.language);
            const complexityBadge = node.complexity > 7 ? ' 🔥' : node.complexity > 4 ? ' ⚡' : '';
            content += `${indent}- ${icon} **${node.name}** — ${node.description || 'File'}${complexityBadge}\n`;
        }

        return content;
    }

    /**
     * Generate Mermaid mind map
     * @param {Object} projectIndex - Project index object
     * @param {Array} files - Filtered files
     * @param {number} maxDepth - Maximum depth
     * @returns {string} Mermaid diagram content
     */
    generateMermaidMindmap(projectIndex, files, maxDepth) {
        let mermaid = '```mermaid\n';
        mermaid += 'graph TD\n';

        const project = projectIndex.project;
        const rootId = 'ROOT';

        mermaid += `    ${rootId}["${project.description || 'Project'}"]\n`;

        // Add main categories
        const categories = this.groupFilesByCategory(files);

        Object.entries(categories).forEach(([category, categoryFiles], index) => {
            const categoryId = `CAT${index}`;
            mermaid += `    ${rootId} --> ${categoryId}["${category} (${categoryFiles.length})"]\n`;

            // Add top files in each category (limit to avoid cluttering)
            categoryFiles.slice(0, 5).forEach((file, fileIndex) => {
                const fileId = `${categoryId}_F${fileIndex}`;
                const fileName = file.name || path.basename(file.path);
                mermaid += `    ${categoryId} --> ${fileId}["${fileName}"]\n`;
            });
        });

        mermaid += '```\n';
        return mermaid;
    }

    /**
     * Generate DOT (Graphviz) mind map
     * @param {Object} projectIndex - Project index object
     * @param {Array} files - Filtered files
     * @param {number} maxDepth - Maximum depth
     * @returns {string} DOT content
     */
    generateDotMindmap(projectIndex, files, maxDepth) {
        const project = projectIndex.project;

        let dot = 'digraph ProjectMindMap {\n';
        dot += '  rankdir=LR;\n';
        dot += '  node [shape=box, style=rounded];\n\n';

        // Root node
        dot += `  "root" [label="${project.description || 'Project'}", style=filled, fillcolor=lightblue];\n`;

        // Add categories
        const categories = this.groupFilesByCategory(files);

        Object.entries(categories).forEach(([category, categoryFiles], index) => {
            const categoryId = `cat${index}`;
            dot += `  "${categoryId}" [label="${category}\\n(${categoryFiles.length} files)", style=filled, fillcolor=lightgreen];\n`;
            dot += `  "root" -> "${categoryId}";\n`;

            // Add representative files
            categoryFiles.slice(0, 3).forEach((file, fileIndex) => {
                const fileId = `${categoryId}_f${fileIndex}`;
                const fileName = file.name || path.basename(file.path);
                dot += `  "${fileId}" [label="${fileName}", style=filled, fillcolor=lightyellow];\n`;
                dot += `  "${categoryId}" -> "${fileId}";\n`;
            });
        });

        dot += '}\n';
        return dot;
    }

    /**
     * Generate full documentation
     * @param {Object} projectIndex - Project index object
     * @param {Object} options - Export options
     * @returns {Promise<string[]>} Array of documentation content (split if needed)
     */
    async generateFullDocumentation(projectIndex, options = {}) {
        const { format = 'markdown', maxFileSize = this.maxFileSize, splitFiles = true } = options;

        let fullDoc = '';

        // Title page
        fullDoc += this.generateTitlePage(projectIndex);

        // Table of contents
        fullDoc += this.generateTableOfContents(projectIndex);

        // Project overview
        fullDoc += this.generateProjectOverview(projectIndex);

        // Architecture analysis
        fullDoc += this.generateArchitectureSection(projectIndex);

        // File documentation
        fullDoc += this.generateFileDocumentation(projectIndex);

        // Appendices
        fullDoc += this.generateAppendices(projectIndex);

        // Split into multiple files if needed
        if (splitFiles && Buffer.byteLength(fullDoc, 'utf8') > maxFileSize) {
            return this.splitDocumentation(fullDoc, maxFileSize);
        }

        return [fullDoc];
    }

    /**
     * Generate title page
     * @param {Object} projectIndex - Project index object
     * @returns {string} Title page content
     */
    generateTitlePage(projectIndex) {
        const project = projectIndex.project;
        const date = new Date().toLocaleDateString();

        return `# ${project.description || 'Project Documentation'}

**Generated by SVC Indexer**  
*Date: ${date}*

---

## Project Information

- **Path**: \`${project.rootPath}\`
- **Languages**: ${projectIndex.metadata.languages.join(', ')}
- **Framework**: ${project.framework || 'None specified'}
- **Total Files**: ${projectIndex.metadata.totalFiles}
- **Total Size**: ${this.formatBytes(projectIndex.metadata.totalSize)}

${projectIndex.aiGeneratedOverview ? `\n## AI-Generated Overview\n\n${projectIndex.aiGeneratedOverview}\n` : ''}

---

`;
    }

    /**
     * Generate table of contents
     * @param {Object} projectIndex - Project index object
     * @returns {string} Table of contents
     */
    generateTableOfContents(projectIndex) {
        return `## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Analysis](#architecture-analysis)
3. [File Documentation](#file-documentation)
   - [Controllers](#controllers)
   - [Services](#services)
   - [Models](#models)
   - [Utilities](#utilities)
   - [Tests](#tests)
   - [Configuration](#configuration)
4. [Dependencies](#dependencies)
5. [Complexity Analysis](#complexity-analysis)
6. [Recommendations](#recommendations)

---

`;
    }

    /**
     * Generate project overview section
     * @param {Object} projectIndex - Project index object
     * @returns {string} Project overview content
     */
    generateProjectOverview(projectIndex) {
        const analysis = projectIndex.analysis;

        let content = `## Project Overview

### Technologies Used

**Programming Languages:**
${projectIndex.metadata.languages.map(lang => `- ${lang}`).join('\n')}

${analysis.frameworks.length > 0 ? `**Frameworks:**
${analysis.frameworks.map(fw => `- ${fw}`).join('\n')}` : ''}

### Architecture Patterns

${analysis.architecture.length > 0 ?
            analysis.architecture.map(pattern => `- ${pattern}`).join('\n') :
            '- No specific patterns detected'}

### Design Patterns

${analysis.patterns.length > 0 ?
            analysis.patterns.map(pattern => `- ${pattern}`).join('\n') :
            '- No specific patterns detected'}

### Test Coverage

- **Test Files**: ${analysis.testCoverage.testFiles}
- **Source Files**: ${analysis.testCoverage.sourceFiles}
- **Estimated Coverage**: ${analysis.testCoverage.estimatedCoverage}%
- **Has Tests**: ${analysis.testCoverage.hasTests ? 'Yes' : 'No'}

### Documentation Quality

- **Documentation Files**: ${analysis.documentation.documentationFiles}
- **Files with Docs**: ${analysis.documentation.filesWithDocumentation}
- **Documentation Ratio**: ${Math.round(analysis.documentation.documentationRatio)}%
- **Has README**: ${analysis.documentation.hasReadme ? 'Yes' : 'No'}

---

`;

        return content;
    }

    /**
     * Generate architecture section
     * @param {Object} projectIndex - Project index object
     * @returns {string} Architecture content
     */
    generateArchitectureSection(projectIndex) {
        let content = `## Architecture Analysis

### Project Structure

\`\`\`
${this.generateTextStructure(projectIndex.structure, 0, 3)}
\`\`\`

### Dependencies

**External Dependencies:**
${projectIndex.analysis.dependencies.externalDependencies.length > 0 ?
            projectIndex.analysis.dependencies.externalDependencies.map(dep => `- ${dep}`).join('\n') :
            '- None detected'}

**Internal Modules:**
${projectIndex.analysis.dependencies.internalModules.length > 0 ?
            projectIndex.analysis.dependencies.internalModules.slice(0, 10).map(mod => `- ${mod}`).join('\n') :
            '- None detected'}

${projectIndex.aiArchitectureAnalysis ? `\n### AI Architecture Analysis\n\n${projectIndex.aiArchitectureAnalysis}\n` : ''}

---

`;

        return content;
    }

    /**
     * Generate file documentation section
     * @param {Object} projectIndex - Project index object
     * @returns {string} File documentation content
     */
    generateFileDocumentation(projectIndex) {
        let content = `## File Documentation

`;

        // Group files by type
        const filesByType = this.groupFilesByType(projectIndex.files);

        Object.entries(filesByType).forEach(([type, files]) => {
            if (files.length === 0) return;

            content += `### ${this.capitalizeFirstLetter(type)}s\n\n`;

            files.forEach(file => {
                content += this.generateFileEntry(file);
            });

            content += '\n';
        });

        return content;
    }

    /**
     * Generate individual file entry
     * @param {Object} file - File object
     * @returns {string} File entry content
     */
    generateFileEntry(file) {
        const fileName = file.name || path.basename(file.path);
        const complexityEmoji = this.getComplexityEmoji(file.complexity);

        let entry = `#### ${fileName} ${complexityEmoji}\n\n`;
        entry += `**Path:** \`${file.path}\`  \n`;
        entry += `**Type:** ${file.type}  \n`;
        entry += `**Language:** ${file.language}  \n`;
        entry += `**Lines:** ${file.lineCount}  \n`;
        entry += `**Complexity:** ${file.complexity}/10  \n`;

        if (file.size) {
            entry += `**Size:** ${this.formatBytes(file.size)}  \n`;
        }

        if (file.description) {
            entry += `\n**Description:** ${file.description}\n`;
        }

        if (file.aiDetailedDoc) {
            entry += `\n**AI Analysis:** ${file.aiDetailedDoc}\n`;
        }

        if (file.metadata) {
            if (file.metadata.classes && file.metadata.classes.length > 0) {
                entry += `\n**Classes:** ${file.metadata.classes.join(', ')}\n`;
            }

            if (file.metadata.functions && file.metadata.functions.length > 0) {
                entry += `\n**Functions:** ${file.metadata.functions.slice(0, 5).join(', ')}${file.metadata.functions.length > 5 ? '...' : ''}\n`;
            }

            if (file.metadata.dependencies && file.metadata.dependencies.length > 0) {
                entry += `\n**Dependencies:** ${file.metadata.dependencies.slice(0, 5).join(', ')}${file.metadata.dependencies.length > 5 ? '...' : ''}\n`;
            }
        }

        if (file.doc && file.doc.trim()) {
            entry += `\n**Documentation:**\n\`\`\`\n${file.doc.substring(0, 500)}${file.doc.length > 500 ? '...' : ''}\n\`\`\`\n`;
        }

        entry += '\n---\n\n';
        return entry;
    }

    /**
     * Generate appendices
     * @param {Object} projectIndex - Project index object
     * @returns {string} Appendices content
     */
    generateAppendices(projectIndex) {
        return `## Dependencies

### External Dependencies
${projectIndex.analysis.dependencies.externalDependencies.map(dep => `- ${dep}`).join('\n') || '- None'}

### Internal Modules
${projectIndex.analysis.dependencies.internalModules.map(mod => `- ${mod}`).join('\n') || '- None'}

## Complexity Analysis

### Distribution by Complexity Level
${Object.entries(projectIndex.metadata.complexity.distribution || {})
            .map(([level, count]) => `- Level ${level}: ${count} files`)
            .join('\n')}

### Recommendations

Based on the analysis, here are some recommendations:

1. **High Complexity Files**: Review files with complexity > 7 for potential refactoring
2. **Test Coverage**: ${projectIndex.analysis.testCoverage.estimatedCoverage < 50 ? 'Consider adding more tests' : 'Good test coverage'}
3. **Documentation**: ${projectIndex.analysis.documentation.documentationRatio < 30 ? 'Add more inline documentation' : 'Good documentation coverage'}
4. **Architecture**: ${projectIndex.analysis.architecture.includes('Unknown') ? 'Consider adopting a clear architectural pattern' : 'Architecture patterns are well defined'}

---

*Generated by SVC Indexer on ${new Date().toISOString()}*
`;
    }

    /**
     * Generate API specification in YAML format
     * @param {Object} projectIndex - Project index object
     * @returns {Promise<string>} YAML content
     */
    async generateAPISpec(projectIndex) {
        const spec = {
            info: {
                title: `${projectIndex.project.description || 'Project'} Internal API Specification`,
                version: '1.0.0',
                description: 'Generated internal API specification',
                generatedAt: new Date().toISOString()
            },
            project: {
                path: projectIndex.project.rootPath,
                languages: projectIndex.metadata.languages,
                frameworks: projectIndex.analysis.frameworks,
                architecture: projectIndex.analysis.architecture
            },
            components: {}
        };

        // Add file components
        projectIndex.files.forEach(file => {
            if (file.metadata && (file.metadata.functions?.length > 0 || file.metadata.classes?.length > 0)) {
                const componentName = file.name || path.basename(file.path, path.extname(file.path));

                spec.components[componentName] = {
                    path: file.path,
                    type: file.type,
                    language: file.language,
                    complexity: file.complexity,
                    description: file.description,
                    classes: file.metadata.classes || [],
                    functions: file.metadata.functions || [],
                    dependencies: file.metadata.dependencies || []
                };
            }
        });

        return YAML.stringify(spec, { indent: 2 });
    }

    /**
     * Generate JSON export
     * @param {Object} projectIndex - Project index object
     * @returns {Object} JSON data
     */
    generateJSONExport(projectIndex) {
        return {
            exportInfo: {
                tool: 'SVC Indexer',
                version: '1.0.0',
                exportedAt: new Date().toISOString()
            },
            project: projectIndex.project,
            metadata: projectIndex.metadata,
            analysis: projectIndex.analysis,
            files: projectIndex.files.map(file => ({
                ...file,
                relativePath: path.relative(projectIndex.project.rootPath, file.path)
            })),
            structure: projectIndex.structure
        };
    }

    /**
     * Generate PDF from markdown content
     * @param {string} markdownContent - Markdown content
     * @param {string} outputPath - Output PDF path
     * @returns {Promise<void>}
     */
    async generatePDF(markdownContent, outputPath) {
        return new Promise((resolve, reject) => {
            const options = {
                cssPath: null, // Could add custom CSS
                paperFormat: 'A4',
                paperBorder: '2cm',
                runningsPath: null
            };

            markdownPdf(options)
                .from.string(markdownContent)
                .to(outputPath, (err) => {
                    if (err) {
                        reject(new Error(`PDF generation failed: ${err.message}`));
                    } else {
                        resolve();
                    }
                });
        });
    }

    // Helper methods

    /**
     * Split documentation into multiple files
     * @param {string} content - Full documentation content
     * @param {number} maxSize - Maximum size per file
     * @returns {string[]} Array of split content
     */
    splitDocumentation(content, maxSize) {
        const sections = content.split(/^## /gm);
        const files = [];
        let currentFile = sections[0]; // Title section

        for (let i = 1; i < sections.length; i++) {
            const section = '## ' + sections[i];
            const newSize = Buffer.byteLength(currentFile + section, 'utf8');

            if (newSize > maxSize && currentFile.length > 0) {
                files.push(currentFile);
                currentFile = section;
            } else {
                currentFile += section;
            }
        }

        if (currentFile.length > 0) {
            files.push(currentFile);
        }

        return files.length > 0 ? files : [content];
    }

    /**
     * Group files by category for mind maps
     * @param {Array} files - Array of files
     * @returns {Object} Grouped files
     */
    groupFilesByCategory(files) {
        const categories = {
            'Source Code': [],
            'Tests': [],
            'Configuration': [],
            'Documentation': [],
            'Assets': []
        };

        files.forEach(file => {
            switch (file.type) {
                case 'test':
                    categories['Tests'].push(file);
                    break;
                case 'config':
                    categories['Configuration'].push(file);
                    break;
                case 'readme':
                case 'documentation':
                    categories['Documentation'].push(file);
                    break;
                case 'style':
                case 'template':
                case 'data':
                    categories['Assets'].push(file);
                    break;
                default:
                    categories['Source Code'].push(file);
            }
        });

        // Remove empty categories
        Object.keys(categories).forEach(key => {
            if (categories[key].length === 0) {
                delete categories[key];
            }
        });

        return categories;
    }

    /**
     * Group files by type
     * @param {Array} files - Array of files
     * @returns {Object} Grouped files
     */
    groupFilesByType(files) {
        const types = {};

        files.forEach(file => {
            const type = file.type || 'other';
            if (!types[type]) {
                types[type] = [];
            }
            types[type].push(file);
        });

        // Sort by complexity (highest first)
        Object.keys(types).forEach(type => {
            types[type].sort((a, b) => (b.complexity || 0) - (a.complexity || 0));
        });

        return types;
    }

    /**
     * Generate text-based structure representation
     * @param {Object} node - Structure node
     * @param {number} depth - Current depth
     * @param {number} maxDepth - Maximum depth
     * @returns {string} Text structure
     */
    generateTextStructure(node, depth, maxDepth) {
        if (depth >= maxDepth || !node) return '';

        const indent = '  '.repeat(depth);
        let content = '';

        if (node.type === 'folder') {
            content += `${indent}${node.name}/\n`;

            if (node.children) {
                node.children.forEach(child => {
                    content += this.generateTextStructure(child, depth + 1, maxDepth);
                });
            }
        } else if (node.type === 'file') {
            const icon = this.getFileTypeIcon(node.fileType);
            content += `${indent}${icon} ${node.name}\n`;
        }

        return content;
    }

    /**
     * Get file icon based on type and language
     * @param {string} fileType - File type
     * @param {string} language - Programming language
     * @returns {string} Icon emoji
     */
    getFileIcon(fileType, language) {
        const icons = {
            class: '🏗️',
            module: '📦',
            component: '🧩',
            service: '⚙️',
            controller: '🎮',
            model: '📊',
            utility: '🔧',
            test: '🧪',
            config: '⚙️',
            readme: '📖',
            documentation: '📝',
            script: '📜',
            style: '🎨',
            template: '📄',
            data: '📈'
        };

        return icons[fileType] || '📄';
    }

    /**
     * Get file type icon for text structure
     * @param {string} fileType - File type
     * @returns {string} Icon character
     */
    getFileTypeIcon(fileType) {
        const icons = {
            class: '🏗',
            module: '📦',
            component: '🧩',
            service: '⚙',
            controller: '🎮',
            model: '📊',
            utility: '🔧',
            test: '🧪',
            config: '⚙',
            readme: '📖',
            documentation: '📝'
        };

        return icons[fileType] || '📄';
    }

    /**
     * Get complexity emoji
     * @param {number} complexity - Complexity score
     * @returns {string} Complexity emoji
     */
    getComplexityEmoji(complexity) {
        if (complexity >= 8) return '🔥';
        if (complexity >= 6) return '⚡';
        if (complexity >= 4) return '💡';
        return '🟢';
    }

    /**
     * Capitalize first letter of string
     * @param {string} str - Input string
     * @returns {string} Capitalized string
     */
    capitalizeFirstLetter(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
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