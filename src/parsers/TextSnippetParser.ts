import { Parser } from './Parser';
import { ReadItLaterSettings } from '../settings';
import { Note } from './Note';
import { App } from 'obsidian';

class TextSnippetParser extends Parser {
    constructor(app: App, settings: ReadItLaterSettings) {
        super(app, settings);
    }

    test(): boolean {
        return true;
    }

    async prepareNote(text: string): Promise<Note> {
        const fileName = `${this.getFormattedDateForFilename()}.md`;
        const content = this.settings.textSnippetNote
            .replace(/%content%/g, text)
            .replace(/%date%/g, this.getFormattedDateForContent());
        return new Note(fileName, content);
    }
}

export default TextSnippetParser;
