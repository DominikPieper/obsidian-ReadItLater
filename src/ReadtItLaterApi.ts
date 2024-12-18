import { Editor } from 'obsidian';
import { NoteService } from './NoteService';

export class ReadItLaterApi {
    constructor(private noteService: NoteService) {}

    /**
    * Create single note from provided input.
    */
    public async processContent(content: string): Promise<void> {
        this.noteService.createNote(content);
    }

    /**
    * Create multiple notes from provided input delimited by delimiter defined in plugin settings.
    */
    public async processContentBatch(contentBatch: string): Promise<void> {
        this.noteService.createNotesFromBatch(contentBatch);
    }

    /**
    * Insert processed content from input at current position in editor.
    */
    public async insertContentAtEditorCursorPosition(content: string, editor: Editor): Promise<void> {
        this.noteService.insertContentAtEditorCursorPosition(content, editor);
    }
}
