# SVC Indexer

A Node.js service to index programming projects with Ollama AI integration for generating comprehensive documentation and mind maps.

## Features

- **Project Indexing**: Automatically scan and analyze programming projects
- **AI Integration**: Use Ollama to generate intelligent descriptions and documentation
- **Multiple Export Formats**: Generate mind maps and documentation in Markdown, PDF, Mermaid, and DOT formats
- **MVC Architecture**: Clean separation of concerns with controllers, services, and models
- **Interactive CLI**: User-friendly command-line interface with colored output
- **Configuration Management**: YAML-based configuration with smart defaults

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd svc-indexer

# Install dependencies
npm install

# Make the CLI globally available
npm link
```

## Prerequisites

- Node.js 18+
- [Ollama](https://ollama.ai/) running locally (for AI features)

## Quick Start

1. **Initialize a project configuration:**
   ```bash
   svc-indexer init -p /path/to/your/project
   ```

2. **Generate a mind map:**
   ```bash
   svc-indexer export-mindmap
   ```

3. **Generate complete documentation:**
   ```bash
   svc-indexer export-full
   ```

## Commands

### `init` - Initialize Project Configuration

Initialize or modify project configuration with an interactive setup.

```bash
svc-indexer init -p <project-path> [options]
```

**Options:**
- `-p, --path <path>` (required): Root path of the project to index
- `-f, --force`: Overwrite existing config file without confirmation

**Example:**
```bash
svc-indexer init -p ./my-react-app
```

### `export-mindmap` - Generate Mind Map

Export project structure as a visual mind map.

```bash
svc-indexer export-mindmap [options]
```

**Options:**
- `-c, --config <path>`: Path to config.yml file (default: ./config.yml)
- `-d, --dry`: Dry run mode - display structure without creating files
- `-o, --output <folder>`: Output folder for exports (default: ./project-exports)
- `--format <format>`: Output format: markdown, mermaid, dot (default: markdown)
- `--max-depth <n>`: Maximum depth to display (default: 10)
- `--types-only <types>`: Filter by file types (comma-separated)

**Examples:**
```bash
# Generate Markdown mind map
svc-indexer export-mindmap

# Generate Mermaid diagram with dry run
svc-indexer export-mindmap --format mermaid --dry

# Export only JavaScript and TypeScript files
svc-indexer export-mindmap --types-only module,component
```

### `export-full` - Generate Complete Documentation

Export comprehensive project documentation with AI analysis.

```bash
svc-indexer export-full [options]
```

**Options:**
- `-c, --config <path>`: Path to config.yml file (default: ./config.yml)
- `-d, --dry`: Dry run mode - display summary without creating files
- `-f, --force`: Overwrite existing exports
- `-p, --pdf`: Generate PDF output (default: true)
- `-o, --output <folder>`: Output folder for exports (default: ./project-exports)
- `--json`: Generate JSON output in addition to markdown
- `--max-size <mb>`: Maximum size per markdown file in MB (default: 10)

**Examples:**
```bash
# Generate complete documentation
svc-indexer export-full

# Dry run to preview what will be generated
svc-indexer export-full --dry

# Generate with JSON export and custom output directory
svc-indexer export-full --json -o ./docs
```

## Configuration

The configuration file (`config.yml`) defines how your project should be indexed:

```yaml
project:
  rootPath: "/path/to/project"
  languages: ["nodejs", "typescript"]
  framework: "react"
  naturalLanguage: "en"
  description: "My awesome project"

include:
  - "src"
  - "lib"
  - "components"

exclude:
  - "node_modules"
  - "dist"
  - "build"
  - ".git"

ollama:
  model: "llama2"
  temperature: 0.7
  maxTokens: 512
  baseUrl: "http://localhost:11434"

general:
  useGitignore: true
  maxFileSize: 1048576
  followSymlinks: false
  ignoreHidden: true
```

### Configuration Options

#### Project Section
- `rootPath`: Root directory of your project
- `languages`: Programming languages used (nodejs, python, java, etc.)
- `framework`: Framework name (react, vue, laravel, etc.)
- `naturalLanguage`: Language for AI descriptions (en, fr, es, de)
- `description`: Project description (optional)

#### Include/Exclude Patterns
- `include`: Folders to include in indexing
- `exclude`: Patterns to exclude (supports gitignore syntax)

#### Ollama Configuration
- `model`: Ollama model name
- `temperature`: AI creativity level (0-2)
- `maxTokens`: Maximum tokens per AI response
- `baseUrl`: Ollama server URL

#### General Settings
- `useGitignore`: Respect .gitignore patterns
- `maxFileSize`: Maximum file size to process (bytes)
- `followSymlinks`: Follow symbolic links
- `ignoreHidden`: Ignore hidden files and folders

## Output Examples

### Mind Map (Markdown)
```markdown
# Mind Map: My Project

## Project Overview
- **Languages**: javascript, typescript
- **Total Files**: 156
- **Frameworks**: React

## Project Structure
- **src/** — Source code directory
  - **components/** — React components
    - 📦 **Button.jsx** — Reusable button component
    - 📦 **Modal.tsx** — Modal dialog component ⚡
  - **services/** — Business logic services
    - ⚙️ **apiService.js** — API communication service
```

### Full Documentation
The full export generates:
- **Markdown Documentation**: Complete project analysis with AI insights
- **API Specification**: YAML-formatted internal API documentation
- **JSON Export**: Machine-readable project data
- **PDF Report**: Printable documentation

## Supported Languages & Frameworks

### Programming Languages
- JavaScript/TypeScript (Node.js, React, Vue, Angular)
- PHP (Laravel, Symfony)
- Python (Django, Flask)
- Java (Spring)
- C#/.NET
- C/C++
- Ruby (Rails)
- Go
- Rust
- Swift
- Kotlin

### File Types Detected
- **Classes**: Object-oriented programming files
- **Modules**: Reusable code modules
- **Components**: UI components (React, Vue, etc.)
- **Services**: Business logic services
- **Controllers**: Request handlers
- **Models**: Data models and entities
- **Utilities**: Helper functions and utilities
- **Tests**: Test files and specs
- **Configuration**: Config files and settings
- **Documentation**: README, docs, and guides

## AI Integration

SVC Indexer uses Ollama for intelligent analysis:

- **File Descriptions**: AI-generated explanations of file purposes
- **Architecture Analysis**: Insights into project structure and patterns
- **Complexity Assessment**: Automated complexity scoring
- **Documentation Enhancement**: AI-powered documentation improvements

### Setting up Ollama

1. Install Ollama: https://ollama.ai/
2. Start Ollama service: `ollama serve`
3. Pull a model: `ollama pull llama2`
4. Configure in `config.yml`

## Troubleshooting

### Common Issues

**"Ollama server is not running"**
- Start Ollama: `ollama serve`
- Check the base URL in config.yml
- Verify Ollama is accessible: `curl http://localhost:11434/api/tags`

**"Configuration file not found"**
- Run `svc-indexer init -p .` to create a configuration
- Check the path to config.yml with `-c` option

**"Permission denied"**
- Ensure read permissions on the project directory
- Check that the output directory is writable

**Large projects taking too long**
- Use `--dry` flag to preview before running
- Adjust `maxFileSize` in configuration
- Use `--types-only` to filter specific file types

### Debug Mode

Enable debug logging by setting the environment variable:
```bash
DEBUG=true svc-indexer export-full
```

## Development

### Project Structure
```
src/
├── controllers/     # CLI command handlers
├── services/        # Business logic (indexing, AI, export)
├── models/          # Data models (Project, File, Folder)
├── utils/           # Utility functions
├── config/          # Configuration management
└── index.js         # Main entry point
```

### Running Tests
```bash
npm test
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the configuration documentation

---

**Generated by SVC Indexer** - A tool for developers, by developers.