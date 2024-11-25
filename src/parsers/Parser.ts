import { App } from 'obsidian';
import TemplateEngine from 'src/template/TemplateEngine';
import { formatDate, isValidUrl } from '../helpers';
import { ReadItLaterSettings } from '../settings';
import { Note } from './Note';

export abstract class Parser {
    protected app: App;
    protected settings: ReadItLaterSettings;
    protected templateEngine: TemplateEngine;

    protected constructor(app: App, settings: ReadItLaterSettings, templateEngine: TemplateEngine) {
        this.app = app;
        this.settings = settings;
        this.templateEngine = templateEngine;
    }

    abstract test(clipboardContent: string): boolean | Promise<boolean>;

    abstract prepareNote(clipboardContent: string): Promise<Note>;

    protected isValidUrl(url: string): boolean {
        return isValidUrl(url);
    }

    protected getFormattedDateForFilename(date: Date | string): string {
        return formatDate(date, this.settings.dateTitleFmt);
    }

    protected getFormattedDateForContent(date: Date | string): string {
        return formatDate(date, this.settings.dateContentFmt);
    }
}
