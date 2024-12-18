import { Editor, Notice } from 'obsidian';
import ParserCreator from './parsers/ParserCreator';
import { VaultRepository } from './repository/VaultRepository';
import { Note } from './parsers/Note';
import FileExistsError from './error/FileExists';
import FileExistsAsk from './modal/FileExistsAsk';
import { FileExistsStrategy } from './enums/fileExistsStrategy';
import ReadItLaterPlugin from './main';
import { getAndCheckUrls } from './helpers/stringUtils';

export class NoteService {
    constructor(
        private parserCreator: ParserCreator,
        private plugin: ReadItLaterPlugin,
        private repository: VaultRepository,
    ) {}

    public async createNote(content: string): Promise<void> {
        const note = await this.makeNote(content);
        try {
            await this.repository.saveNote(note);
        } catch (error) {
            if (error instanceof FileExistsError) {
                this.handleFileExistsError([note]);
            }
        }
    }

    public async createNotesFromBatch(contentBatch: string): Promise<void> {
        const urlCheckResult = getAndCheckUrls(contentBatch, this.plugin.settings.batchProcessDelimiter);
        const existingNotes: Note[] = [];

        for (const contentSegment of urlCheckResult.everyLineIsURL ? urlCheckResult.urls : [contentBatch]) {
            const note = await this.makeNote(contentSegment);
            try {
                await this.repository.saveNote(note);
            } catch (error) {
                if (error instanceof FileExistsError) {
                    existingNotes.push(note);
                }
            }
        }

        if (existingNotes.length > 0) {
            this.handleFileExistsError(existingNotes);
        }
    }

    public async insertContentAtEditorCursorPosition(content: string, editor: Editor): Promise<void> {
        const note = await this.makeNote(content);
        editor.replaceRange(note.content, editor.getCursor());
    }

    private async makeNote(content: string): Promise<Note> {
        const parser = await this.parserCreator.createParser(content);
        return await parser.prepareNote(content);
    }

    private openNote(note: Note): void {
        if (this.plugin.settings.openNewNote || this.plugin.settings.openNewNoteInNewTab) {
            try {
                const file = this.repository.getFileByPath(note.filePath);
                this.plugin.app.workspace
                    .getLeaf(this.plugin.settings.openNewNoteInNewTab ? 'tab' : false)
                    .openFile(file);
            } catch (error) {
                console.error(error);
                new Notice(`Unable to open ${note.getFullFilename()}`);
            }
        }
    }

    private async handleFileExistsError(notes: Note[]): Promise<void> {
        switch (this.plugin.settings.fileExistsStrategy) {
            case FileExistsStrategy.Ask:
                new FileExistsAsk(this.plugin.app, notes, (strategy, doNotAskAgain) => {
                    this.handleFileAskModalResponse(strategy, doNotAskAgain, notes);
                }).open();
                break;
            case FileExistsStrategy.Nothing:
                this.handleFileExistsStrategyNothing(notes);
                break;
            case FileExistsStrategy.AppendToExisting:
                this.handleFileExistsStrategyAppend(notes);
                break;
        }
    }

    private async handleFileAskModalResponse(
        strategy: FileExistsStrategy,
        doNotAskAgain: boolean,
        notes: Note[],
    ): Promise<void> {
        switch (strategy) {
            case FileExistsStrategy.Nothing:
                this.handleFileExistsStrategyNothing(notes);
                break;
            case FileExistsStrategy.AppendToExisting:
                this.handleFileExistsStrategyAppend(notes);
                break;
        }

        if (doNotAskAgain) {
            this.plugin.saveSetting('fileExistsStrategy', strategy as FileExistsStrategy);
        }

        if (notes.length === 1) {
            this.openNote(notes.shift());
        }
    }

    private async handleFileExistsStrategyAppend(notes: Note[]): Promise<void> {
        for (const note of notes) {
            try {
                await this.repository.appendToExistingNote(note);
                new Notice(`${note.getFullFilename()} was updated.`);
            } catch (error) {
                console.error(error);
                new Notice(`${note.getFullFilename()} was not updated!`, 0);
            }
        }
    }

    private handleFileExistsStrategyNothing(notes: Note[]): void {
        for (const note of notes) {
            new Notice(`${note.getFullFilename()} already exists.`);
        }
    }
}
