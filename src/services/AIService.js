/**
 * @fileoverview AI service for Ollama integration
 */

import axios from 'axios';

/**
 * Service for interacting with Ollama AI
 */
export class AIService {
    constructor() {
        this.defaultConfig = {
            baseUrl: 'http://localhost:11434',
            model: 'llama2',
            temperature: 0.7,
            maxTokens: 512
        };
    }

    /**
     * Generate description for a file
     * @param {Object} file - File object
     * @param {Object} context - Additional context
     * @param {Object} config - Ollama configuration
     * @returns {Promise<string>} Generated description
     */
    async generateFileDescription(file, context = {}, config = {}) {
        const ollamaConfig = { ...this.defaultConfig, ...config };

        const prompt = this.buildFileDescriptionPrompt(file, context);

        try {
            const response = await this.callOllama(prompt, ollamaConfig);
            return this.cleanResponse(response);
        } catch (error) {
            console.warn(`AI description failed for ${file.path}: ${error.message}`);
            return file.description || 'File description unavailable';
        }
    }

    /**
     * Generate description for a folder
     * @param {Object} folder - Folder object
     * @param {Object} context - Additional context
     * @param {Object} config - Ollama configuration
     * @returns {Promise<string>} Generated description
     */
    async generateFolderDescription(folder, context = {}, config = {}) {
        const ollamaConfig = { ...this.defaultConfig, ...config };

        const prompt = this.buildFolderDescriptionPrompt(folder, context);

        try {
            const response = await this.callOllama(prompt, ollamaConfig);
            return this.cleanResponse(response);
        } catch (error) {
            console.warn(`AI description failed for folder ${folder.path}: ${error.message}`);
            return folder.description || 'Folder description unavailable';
        }
    }

    /**
     * Enhance project index with AI descriptions
     * @param {Object} projectIndex - Project index object
     * @param {Object} config - Ollama configuration
     * @returns {Promise<void>}
     */
    async enhanceProjectIndex(projectIndex, config = {}) {
        const ollamaConfig = { ...this.defaultConfig, ...config };

        // Generate descriptions for files
        const filePromises = projectIndex.files.map(async (file) => {
            if (!file.description || file.description.length < 10) {
                const description = await this.generateFileDescription(
                    file,
                    {
                        project: projectIndex.project,
                        language: file.language,
                        type: file.type
                    },
                    ollamaConfig
                );
                file.description = description;
            }
        });

        // Generate descriptions for folders
        const folderPromises = projectIndex.folders.map(async (folder) => {
            if (!folder.description || folder.description.length < 10) {
                const description = await this.generateFolderDescription(
                    folder,
                    {
                        project: projectIndex.project,
                        fileCount: folder.fileCount
                    },
                    ollamaConfig
                );
                folder.description = description;
            }
        });

        // Process in batches to avoid overwhelming the API
        await this.processBatched([...filePromises, ...folderPromises], 5);
    }

    /**
     * Generate detailed documentation for the project
     * @param {Object} projectIndex - Project index object
     * @param {Object} config - Ollama configuration
     * @returns {Promise<void>}
     */
    async generateDetailedDocumentation(projectIndex, config = {}) {
        const ollamaConfig = { ...this.defaultConfig, ...config };

        // Generate project overview
        projectIndex.aiGeneratedOverview = await this.generateProjectOverview(
            projectIndex,
            ollamaConfig
        );

        // Generate architecture analysis
        projectIndex.aiArchitectureAnalysis = await this.generateArchitectureAnalysis(
            projectIndex,
            ollamaConfig
        );

        // Generate detailed file documentation
        const detailedPromises = projectIndex.files
            .filter(file => file.complexity > 5) // Focus on complex files
            .map(async (file) => {
                file.aiDetailedDoc = await this.generateDetailedFileDocumentation(
                    file,
                    projectIndex,
                    ollamaConfig
                );
            });

        await this.processBatched(detailedPromises, 3);
    }

    /**
     * Generate project overview
     * @param {Object} projectIndex - Project index object
     * @param {Object} config - Ollama configuration
     * @returns {Promise<string>} Generated overview
     */
    async generateProjectOverview(projectIndex, config) {
        const prompt = `
Analyze this software project and provide a comprehensive overview:

Project Information:
- Languages: ${projectIndex.metadata.languages.join(', ')}
- Total Files: ${projectIndex.metadata.totalFiles}
- Architecture Patterns: ${projectIndex.analysis.architecture.join(', ')}
- Frameworks: ${projectIndex.analysis.frameworks.join(', ')}

Please provide:
1. A brief project summary
2. Main technologies and frameworks used
3. Architecture overview
4. Key components and their roles
5. Overall complexity assessment

Write in ${projectIndex.project.naturalLanguage === 'fr' ? 'French' : 'English'}.
Keep it concise but informative (max 300 words).
`;

        try {
            return await this.callOllama(prompt, config);
        } catch (error) {
            console.warn(`Failed to generate project overview: ${error.message}`);
            return 'Project overview generation failed';
        }
    }

    /**
     * Generate architecture analysis
     * @param {Object} projectIndex - Project index object
     * @param {Object} config - Ollama configuration
     * @returns {Promise<string>} Generated analysis
     */
    async generateArchitectureAnalysis(projectIndex, config) {
        const prompt = `
Analyze the architecture of this software project:

Project Structure:
${JSON.stringify(projectIndex.structure, null, 2)}

Architecture Patterns Detected: ${projectIndex.analysis.architecture.join(', ')}
Design Patterns: ${projectIndex.analysis.patterns.join(', ')}

Provide an analysis covering:
1. Overall architecture assessment
2. Strengths and potential improvements
3. Code organization quality
4. Scalability considerations
5. Recommendations for development

Write in ${projectIndex.project.naturalLanguage === 'fr' ? 'French' : 'English'}.
Be technical but accessible (max 400 words).
`;

        try {
            return await this.callOllama(prompt, config);
        } catch (error) {
            console.warn(`Failed to generate architecture analysis: ${error.message}`);
            return 'Architecture analysis generation failed';
        }
    }

    /**
     * Generate detailed file documentation
     * @param {Object} file - File object
     * @param {Object} projectIndex - Project index object
     * @param {Object} config - Ollama configuration
     * @returns {Promise<string>} Generated documentation
     */
    async generateDetailedFileDocumentation(file, projectIndex, config) {
        const prompt = `
Analyze this source code file in detail:

File: ${file.path}
Type: ${file.type}
Language: ${file.language}
Complexity: ${file.complexity}/10
Lines: ${file.lineCount}

${file.doc ? `Documentation: ${file.doc.substring(0, 500)}` : ''}

${file.metadata ? `
Classes: ${file.metadata.classes?.join(', ') || 'None'}
Functions: ${file.metadata.functions?.slice(0, 5).join(', ') || 'None'}
Dependencies: ${file.metadata.dependencies?.slice(0, 5).join(', ') || 'None'}
` : ''}

Provide detailed documentation including:
1. Purpose and responsibility
2. Key components (classes, functions)
3. Dependencies and relationships
4. Complexity analysis
5. Potential improvements

Write in ${projectIndex.project.naturalLanguage === 'fr' ? 'French' : 'English'}.
Be technical and detailed (max 200 words).
`;

        try {
            return await this.callOllama(prompt, config);
        } catch (error) {
            console.warn(`Failed to generate detailed docs for ${file.path}: ${error.message}`);
            return 'Detailed documentation generation failed';
        }
    }

    /**
     * Build prompt for file description
     * @param {Object} file - File object
     * @param {Object} context - Additional context
     * @returns {string} Generated prompt
     */
    buildFileDescriptionPrompt(file, context) {
        const language = context.project?.naturalLanguage === 'fr' ? 'French' : 'English';

        return `
Describe this ${file.language} file briefly:

File: ${file.path}
Type: ${file.type}
Size: ${file.lineCount} lines
${file.doc ? `Documentation: ${file.doc.substring(0, 200)}` : ''}

Provide a concise description (1-2 sentences) of what this file does.
Write in ${language}.
Focus on the file's purpose and role in the project.
`;
    }

    /**
     * Build prompt for folder description
     * @param {Object} folder - Folder object
     * @param {Object} context - Additional context
     * @returns {string} Generated prompt
     */
    buildFolderDescriptionPrompt(folder, context) {
        const language = context.project?.naturalLanguage === 'fr' ? 'French' : 'English';

        return `
Describe this project folder briefly:

Folder: ${folder.path}
Files: ${folder.fileCount || 0}
${folder.description ? `Current description: ${folder.description}` : ''}

Based on the folder name and context, provide a brief description (1 sentence) of what this folder contains.
Write in ${language}.
Focus on the folder's purpose in the project structure.
`;
    }

    /**
     * Call Ollama API
     * @param {string} prompt - Input prompt
     * @param {Object} config - Ollama configuration
     * @returns {Promise<string>} API response
     */
    async callOllama(prompt, config) {
        const requestData = {
            model: config.model,
            prompt: prompt,
            stream: false,
            options: {
                temperature: config.temperature,
                num_predict: config.maxTokens
            }
        };

        try {
            const response = await axios.post(
                `${config.baseUrl}/api/generate`,
                requestData,
                {
                    timeout: 30000, // 30 second timeout
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data && response.data.response) {
                return response.data.response;
            } else {
                throw new Error('Invalid response format from Ollama');
            }
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                throw new Error('Ollama server is not running. Please start Ollama first.');
            } else if (error.response) {
                throw new Error(`Ollama API error: ${error.response.status} - ${error.response.data?.error || 'Unknown error'}`);
            } else {
                throw new Error(`Ollama request failed: ${error.message}`);
            }
        }
    }

    /**
     * Clean AI response text
     * @param {string} response - Raw AI response
     * @returns {string} Cleaned response
     */
    cleanResponse(response) {
        return response
            .trim()
            .replace(/^\s*-\s*/, '') // Remove leading dash
            .replace(/\n\s*\n/g, '\n') // Remove multiple newlines
            .substring(0, 500); // Limit length
    }

    /**
     * Process promises in batches
     * @param {Promise[]} promises - Array of promises
     * @param {number} batchSize - Batch size
     * @returns {Promise<void>}
     */
    async processBatched(promises, batchSize = 5) {
        for (let i = 0; i < promises.length; i += batchSize) {
            const batch = promises.slice(i, i + batchSize);
            await Promise.allSettled(batch);

            // Small delay between batches to be nice to the API
            if (i + batchSize < promises.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    /**
     * Test Ollama connection
     * @param {Object} config - Ollama configuration
     * @returns {Promise<boolean>} True if connection successful
     */
    async testConnection(config = {}) {
        const ollamaConfig = { ...this.defaultConfig, ...config };

        try {
            const response = await axios.get(`${ollamaConfig.baseUrl}/api/tags`, {
                timeout: 5000
            });
            return response.status === 200;
        } catch (error) {
            console.warn(`Ollama connection test failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Get available models from Ollama
     * @param {Object} config - Ollama configuration
     * @returns {Promise<string[]>} Array of model names
     */
    async getAvailableModels(config = {}) {
        const ollamaConfig = { ...this.defaultConfig, ...config };

        try {
            const response = await axios.get(`${ollamaConfig.baseUrl}/api/tags`);

            if (response.data && response.data.models) {
                return response.data.models.map(model => model.name);
            }

            return [];
        } catch (error) {
            console.warn(`Failed to get Ollama models: ${error.message}`);
            return [];
        }
    }
}