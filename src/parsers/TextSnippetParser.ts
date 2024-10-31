import { App } from 'obsidian';
import { ReadItLaterSettings } from '../settings';
import { Parser } from './Parser';
import { Note } from './Note';
import TemplateEngine from 'src/template/TemplateEngine';

class TextSnippetParser extends Parser {
    constructor(app: App, settings: ReadItLaterSettings, templateEngine: TemplateEngine) {
        super(app, settings, templateEngine);
    }

    test(): boolean {
        return true;
    }

    async prepareNote(text: string): Promise<Note> {
        const fileNameTemplate = this.settings.textSnippetNoteTitle.replace(
            /%date%/g,
            this.getFormattedDateForFilename(),
        );
        const fileName = `${fileNameTemplate}.md`;

        const content = this.settings.textSnippetNote
            .replace(/%content%/g, () => text)
            .replace(/%date%/g, this.getFormattedDateForContent());
        return new Note(fileName, content);
    }
}

export default TextSnippetParser;
