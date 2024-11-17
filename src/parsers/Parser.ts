import { App } from 'obsidian';
import { formatCurrentDate, isValidUrl } from '../helpers';
import { ReadItLaterSettings } from '../settings';
import { Note } from './Note';

export abstract class Parser {
    protected settings: ReadItLaterSettings;
    protected app: App;

    protected constructor(app: App, settings: ReadItLaterSettings) {
        this.app = app;
        this.settings = settings;
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
