import { Parser } from './Parser';
import { ReadItLaterSettings } from '../settings';
import { Note } from './Note';

class TextSnippetParser extends Parser {
    constructor(settings: ReadItLaterSettings) {
        super(settings);
    }

    test(): boolean {
        return true;
    }

    async prepareNote(text: string): Promise<Note> {
        const fileName = `Notice ${this.getFormattedDateForFilename()}.md`;
        const content = this.settings.textSnippetNote.replace(/%content%/g, text);
        return new Note(fileName, content);
    }
}

export default TextSnippetParser;
