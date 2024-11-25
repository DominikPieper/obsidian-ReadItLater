import { App } from 'obsidian';
import TemplateEngine from 'src/template/TemplateEngine';
import { ReadItLaterSettings } from '../settings';
import { Parser } from './Parser';
import { Note } from './Note';

class TextSnippetParser extends Parser {
    constructor(app: App, settings: ReadItLaterSettings, templateEngine: TemplateEngine) {
        super(app, settings, templateEngine);
    }

    test(): boolean {
        return true;
    }

    async prepareNote(text: string): Promise<Note> {
        const createdAt = new Date();

        const fileNameTemplate = this.templateEngine.render(this.settings.textSnippetNoteTitle, {
            date: this.getFormattedDateForFilename(createdAt)
        });

        const content = this.templateEngine.render(this.settings.textSnippetNote, {
            content: text,
            date: this.getFormattedDateForContent(createdAt)
        });
        return new Note(fileNameTemplate, 'md', content, this.settings.textSnippetContentType, createdAt);
    }
}

export default TextSnippetParser;
