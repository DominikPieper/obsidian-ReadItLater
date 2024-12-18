import { Note } from 'src/parsers/Note';
import { CapacitorAdapter, FileSystemAdapter, Notice, TFile, TFolder, normalizePath } from 'obsidian';
import ReadItLaterPlugin from 'src/main';
import { getOsOptimizedPath } from 'src/helpers/fileutils';
import TemplateEngine from 'src/template/TemplateEngine';
import { formatDate } from 'src/helpers/date';
import FileNotFoundError from 'src/error/FileNotFound';
import FileExistsError from '../error/FileExists';
import { VaultRepository } from './VaultRepository';

export default class DefaultVaultRepository implements VaultRepository {
    private plugin: ReadItLaterPlugin;
    private templateEngine: TemplateEngine;

    constructor(plugin: ReadItLaterPlugin, templateEngine: TemplateEngine) {
        this.plugin = plugin;
        this.templateEngine = templateEngine;
    }

    public async saveNote(note: Note): Promise<void> {
        let filePath;

        if (
            this.plugin.app.vault.adapter instanceof CapacitorAdapter ||
            this.plugin.app.vault.adapter instanceof FileSystemAdapter
        ) {
            filePath = getOsOptimizedPath(
                '/',
                note.getFullFilename(),
                this.plugin.app.vault.adapter,
                this.plugin.getFileSystemLimits(),
            );
        } else {
            filePath = normalizePath(`/${note.getFullFilename()}`);
        }

        if (this.plugin.settings.inboxDir) {
            const inboxDir = this.templateEngine.render(this.plugin.settings.inboxDir, {
                date: formatDate(note.createdAt, this.plugin.settings.dateTitleFmt),
                fileName: note.fileName,
                contentType: note.contentType,
            });
            await this.createDirectory(inboxDir);
            if (
                this.plugin.app.vault.adapter instanceof CapacitorAdapter ||
                this.plugin.app.vault.adapter instanceof FileSystemAdapter
            ) {
                filePath = getOsOptimizedPath(
                    inboxDir,
                    note.getFullFilename(),
                    this.plugin.app.vault.adapter,
                    this.plugin.getFileSystemLimits(),
                );
            } else {
                filePath = normalizePath(`${inboxDir}/${note.getFullFilename()}`);
            }
        }

        note.filePath = filePath;

        if (await this.exists(note.filePath)) {
            throw new FileExistsError(`${note.getFullFilename()} already exists!`);
        } else {
            const newFile = await this.plugin.app.vault.create(note.filePath, note.content);
            if (this.plugin.settings.openNewNote || this.plugin.settings.openNewNoteInNewTab) {
                this.plugin.app.workspace
                    .getLeaf(this.plugin.settings.openNewNoteInNewTab ? 'tab' : false)
                    .openFile(newFile);
            }
            new Notice(`${note.getFullFilename()} created successfully`);
        }
    }

    public async createDirectory(directoryPath: string): Promise<void> {
        const normalizedPath = normalizePath(directoryPath);
        const directory = this.plugin.app.vault.getAbstractFileByPath(normalizedPath);
        if (directory && directory instanceof TFolder) {
            return;
        }
        await this.plugin.app.vault.createFolder(normalizedPath);
    }

    public async exists(filePath: string): Promise<boolean> {
        return await this.plugin.app.vault.adapter.exists(filePath);
    }

    public getFileByPath(filePath: string): TFile {
        const file = this.plugin.app.vault.getFileByPath(filePath);

        if (file === null) {
            throw new FileNotFoundError(`File not found: ${filePath}`);
        }

        return file;
    }

    public async appendToExistingNote(note: Note): Promise<void> {
        let file;
        try {
            file = this.getFileByPath(note.filePath);
        } catch (error) {
            if (error instanceof FileNotFoundError) {
                new Notice(`Unable to edit ${note.getFullFilename()}`);
            } else {
                throw error;
            }
        }

        await this.plugin.app.vault.process(file, (data) => {
            return `${data}\n\n${note.content}`;
        });
    }
}
