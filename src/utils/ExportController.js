import chalk from 'chalk';
import ora from 'ora';
import { ConfigService } from '../services/ConfigService.js';
import { IndexingService } from '../services/IndexingService.js';
import { ExportService } from '../services/ExportService.js';
import { Logger } from '../utils/Logger.js';

/**
 * Controller for handling export commands
 */
export class ExportController {
  /**
   * Creates a new ExportController instance
   */
  constructor() {
    this.configService = new ConfigService();
    this.indexingService = new IndexingService();
    this.exportService = new ExportService();
  }

  /**
   * Handles the export command
   * @param {Object} options - Command options
   * @param {string} options.config - Path to config file
   * @param {boolean} options.dry - Dry run mode
   * @param {string} options.output - Output directory
   */
  async handle(options) {
    Logger.section('Project Export');

    try {
      // Load configuration
      Logger.info(`Loading configuration from: ${chalk.cyan(options.config)}`);
      const config = await this.configService.load(options.config);

      Logger.info(`Project: ${chalk.cyan(config.project.rootPath)}`);
      Logger.info(`Languages: ${chalk.cyan(config.project.languages.join(', '))}`);

      // Index project
      const spinner = ora('Indexing project files...').start();

      try {
        const project = await this.indexingService.indexProject(config);
        const stats = project.getStats();

        spinner.succeed('Project indexed successfully');

        // Display statistics
        Logger.stats({
          'Total Files': stats.totalFiles,
          'Total Folders': stats.totalFolders,
          'Languages': stats.languages.join(', '),
          'Framework': stats.framework || 'None'
        });

        // Export to markdown
        if (options.dry) {
          Logger.subsection('Dry Run - Generated Markdown Preview');
          const markdown = await this.exportService.exportToMarkdown(project, {
            dryRun: true
          });

          // Show first 1000 characters of the markdown
          console.log(chalk.gray('--- Markdown Preview (first 1000 chars) ---'));
          console.log(markdown.substring(0, 1000));
          if (markdown.length > 1000) {
            console.log(chalk.gray('\n[... truncated ...]'));
          }
          console.log(chalk.gray('--- End Preview ---'));

          Logger.info(`Full markdown would be ${chalk.cyan(markdown.length)} characters long`);
        } else {
          const exportSpinner = ora('Exporting to markdown...').start();

          const outputFile = await this.exportService.exportToMarkdown(project, {
            outputPath: options.output,
            dryRun: false
          });

          exportSpinner.succeed('Export completed');
          Logger.success(`Project exported to: ${chalk.cyan(outputFile)}`);
        }

        // Show file breakdown by type
        this.displayFileBreakdown(project);

      } catch (indexError) {
        spinner.fail('Failed to index project');
        throw indexError;
      }

    } catch (error) {
      Logger.error(`Export failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Displays a breakdown of files by type
   * @param {Project} project - Indexed project
   */
  displayFileBreakdown(project) {
    Logger.subsection('File Breakdown');

    const filesByType = {};
    project.files.forEach(file => {
      if (!filesByType[file.type]) {
        filesByType[file.type] = [];
      }
      filesByType[file.type].push(file);
    });

    const sortedTypes = Object.keys(filesByType).sort();

    sortedTypes.forEach(type => {
      const files = filesByType[type];
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      const avgSize = totalSize / files.length;

      Logger.info(`${chalk.cyan(type)}: ${files.length} files (avg: ${Logger.formatSize(avgSize)})`);

      // Show a few example files
      const examples = files.slice(0, 3);
      examples.forEach(file => {
        console.log(`  ${chalk.gray('•')} ${file.relativePath}`);
      });

      if (files.length > 3) {
        console.log(`  ${chalk.gray(`... and ${files.length - 3} more`)}`);
      }
    });
  }
}