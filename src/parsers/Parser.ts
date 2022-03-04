import { Note } from './Note';
import { App, moment } from 'obsidian';
import { ReadItLaterSettings } from '../settings';

export abstract class Parser {
    protected settings: ReadItLaterSettings;
    protected app: App;

    protected constructor(app: App, settings: ReadItLaterSettings) {
        this.app = app;
        this.settings = settings;
    }

    abstract test(clipboardContent: string): boolean;

    abstract prepareNote(clipboardContent: string): Promise<Note>;

    protected isValidUrl(url: string): boolean {
        try {
            new URL(url);
        } catch (e) {
            return false;
        }
        return true;
    }

    protected getFormattedDateForFilename(): string {
        const date = new Date();
        return moment(date).format('YYYY-MM-DD HH-mm-ss');
    }
}
