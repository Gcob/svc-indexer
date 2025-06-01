/**
 * @fileoverview Folder model definition
 */

/**
 * Represents a folder in the project structure
 */
export class Folder {
    /**
     * Create a new Folder instance
     * @param {Object} config - Folder configuration
     * @param {string} config.path - Folder path (absolute or relative)
     * @param {boolean} [config.include=true] - Whether to include this folder in indexing
     * @param {string} [config.description=''] - Folder description
     * @param {number} [config.depth=0] - Folder depth from root
     */
    constructor(config) {
        this.path = config.path;
        this.include = config.include !== undefined ? config.include : true;
        this.description = config.description || '';
        this.depth = config.depth || 0;
        this.files = [];
        this.subfolders = [];
        this.fileCount = 0;
        this.totalSize = 0;
    }

    /**
     * Add a file to this folder
     * @param {import('./File.js').File} file - File to add
     */
    addFile(file) {
        this.files.push(file);
        this.fileCount++;
        this.totalSize += file.size || 0;
    }

    /**
     * Add a subfolder to this folder
     * @param {Folder} folder - Subfolder to add
     */
    addSubfolder(folder) {
        this.subfolders.push(folder);
    }

    /**
     * Get folder name from path
     * @returns {string} Folder name
     */
    getName() {
        return this.path.split('/').pop() || this.path.split('\\').pop() || this.path;
    }

    /**
     * Check if folder should be included in indexing
     * @returns {boolean} True if should be included
     */
    shouldInclude() {
        return this.include;
    }

    /**
     * Get all files recursively
     * @param {boolean} [includedOnly=true] - Only return files from included folders
     * @returns {import('./File.js').File[]} Array of files
     */
    getAllFiles(includedOnly = true) {
        let allFiles = [];

        if (!includedOnly || this.include) {
            allFiles = [...this.files];
        }

        for (const subfolder of this.subfolders) {
            if (!includedOnly || subfolder.include) {
                allFiles = allFiles.concat(subfolder.getAllFiles(includedOnly));
            }
        }

        return allFiles;
    }

    /**
     * Get folder statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        const allFiles = this.getAllFiles(false);
        const includedFiles = this.getAllFiles(true);

        return {
            totalFiles: allFiles.length,
            includedFiles: includedFiles.length,
            totalFolders: this.getAllSubfolders(false).length + 1,
            includedFolders: this.getAllSubfolders(true).length + (this.include ? 1 : 0),
            totalSize: allFiles.reduce((sum, file) => sum + (file.size || 0), 0),
            includedSize: includedFiles.reduce((sum, file) => sum + (file.size || 0), 0)
        };
    }

    /**
     * Get all subfolders recursively
     * @param {boolean} [includedOnly=true] - Only return included folders
     * @returns {Folder[]} Array of subfolders
     */
    getAllSubfolders(includedOnly = true) {
        let allSubfolders = [];

        for (const subfolder of this.subfolders) {
            if (!includedOnly || subfolder.include) {
                allSubfolders.push(subfolder);
                allSubfolders = allSubfolders.concat(subfolder.getAllSubfolders(includedOnly));
            }
        }

        return allSubfolders;
    }

    /**
     * Convert folder to plain object for serialization
     * @returns {Object} Plain object representation
     */
    toObject() {
        return {
            path: this.path,
            include: this.include,
            description: this.description,
            depth: this.depth,
            fileCount: this.fileCount,
            totalSize: this.totalSize,
            files: this.files.map(file => file.toObject()),
            subfolders: this.subfolders.map(folder => folder.toObject())
        };
    }

    /**
     * Create Folder instance from plain object
     * @param {Object} obj - Plain object representation
     * @returns {Folder} New Folder instance
     */
    static fromObject(obj) {
        const folder = new Folder(obj);

        // Reconstruct files and subfolders if they exist
        if (obj.files) {
            const { File } = await import('./File.js');
            folder.files = obj.files.map(fileObj => File.fromObject(fileObj));
        }

        if (obj.subfolders) {
            folder.subfolders = obj.subfolders.map(folderObj => Folder.fromObject(folderObj));
        }

        return folder;
    }
}