import { Editor, Notice } from 'obsidian';
import ParserCreator from './parsers/ParserCreator';
import { VaultRepository } from './repository/VaultRepository';
import { ReadItLaterSettings } from './settings';
import { Note } from './parsers/Note';
import { getDelimiterValue } from './enums/delimiter';
import { isValidUrl } from './helpers/fileutils';
import { HTTPS_PROTOCOL, HTTP_PROTOCOL } from './constants/urlProtocols';
import FileExistsError from './error/FileExists';
import FileExistsAsk from './modal/FileExistsAsk';
import { FileExistsStrategy } from './enums/fileExistsStrategy';
import ReadItLaterPlugin from './main';

export class NoteService {
    constructor(
        private parserCreator: ParserCreator,
        private plugin: ReadItLaterPlugin,
        private repository: VaultRepository,
        private settings: ReadItLaterSettings,
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
        const clipboardSegmentsList = (() => {
            const cleanClipboardData = contentBatch
                .trim()
                .split(getDelimiterValue(this.settings.batchProcessDelimiter))
                .filter((line) => line.trim().length > 0);
            const everyLineIsURL = cleanClipboardData.reduce((status: boolean, url: string): boolean => {
                return status && isValidUrl(url, [HTTP_PROTOCOL, HTTPS_PROTOCOL]);
            }, true);
            return everyLineIsURL ? cleanClipboardData : [contentBatch];
        })();
        for (const clipboardSegment of clipboardSegmentsList) {
            this.createNote(clipboardSegment);
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

    private async handleFileExistsError(notes: Note[]): Promise<void> {
        switch (this.settings.fileExistsStrategy) {
            case FileExistsStrategy.Ask:
                new FileExistsAsk(this.plugin.app, notes, (strategy, doNotAskAgain) => {
                    this.handleFileAskModalResponse(strategy, doNotAskAgain, notes);
                }).open();
                break;
            case FileExistsStrategy.Nothing:
                this.handleFileExistsStrategyNothing(notes);
                break;
            case FileExistsStrategy.AppendToExisting:
                console.log(notes);
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
                console.log(notes);
                break;
        }

        if (doNotAskAgain) {
            this.plugin.saveSetting('fileExistsStrategy', strategy as FileExistsStrategy);
        }
    }

    private async handleFileExistsStrategyNothing(notes: Note[]): Promise<void> {
        new Notice(`${notes.map((note) => note.fileName).join(',')} already exists.`);
    }
}
