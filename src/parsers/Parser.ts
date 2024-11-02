import { App } from 'obsidian';
import { formatCurrentDate, isValidUrl } from '../helpers';
import TemplateEngine from 'src/template/TemplateEngine';
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

    protected getFormattedDateForFilename(): string {
        return formatCurrentDate(this.settings.dateTitleFmt);
    }

    protected getFormattedDateForContent(): string {
        return formatCurrentDate(this.settings.dateContentFmt);
    }
}
