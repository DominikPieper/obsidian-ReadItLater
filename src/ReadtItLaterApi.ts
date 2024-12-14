import { Editor } from 'obsidian';
import { ReadItLaterSettings } from './settings';
import { NoteService } from './NoteService';

export class ReadItLaterApi {
    constructor(private noteService: NoteService, private settings: ReadItLaterSettings) {}

    public async processContent(content: string): Promise<void> {
        this.noteService.createNote(content);
    }

    public async processContentBatch(contentBatch: string): Promise<void> {
        this.noteService.createNotesFromBatch(contentBatch);
    }

    public async insertContentAtEditorCursorPosition(content: string, editor: Editor): Promise<void> {
        this.noteService.insertContentAtEditorCursorPosition(content, editor);
    }
}
