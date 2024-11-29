import { App } from 'obsidian';
import TemplateEngine from 'src/template/TemplateEngine';
import ReadItLaterPlugin from 'src/main';
import { formatDate, isValidUrl } from '../helpers';
import { Note } from './Note';

export abstract class Parser {
    protected app: App;
    protected plugin: ReadItLaterPlugin;
    protected templateEngine: TemplateEngine;

    constructor(app: App, plugin: ReadItLaterPlugin, templateEngine: TemplateEngine) {
        this.app = app;
        this.plugin = plugin;
        this.templateEngine = templateEngine;
    }

    abstract test(clipboardContent: string): boolean | Promise<boolean>;

    abstract prepareNote(clipboardContent: string): Promise<Note>;

    protected isValidUrl(url: string): boolean {
        return isValidUrl(url);
    }

    protected getFormattedDateForFilename(date: Date | string): string {
        return formatDate(date, this.plugin.settings.dateTitleFmt);
    }

    protected getFormattedDateForContent(date: Date | string): string {
        return formatDate(date, this.plugin.settings.dateContentFmt);
    }
}
