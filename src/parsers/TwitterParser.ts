import { Parser } from './Parser';
import { ReadItLaterSettings } from '../settings';
import { App, request } from 'obsidian';
import { Note } from './Note';
import { parseHtmlContent } from './parsehtml';

class TwitterParser extends Parser {
    private PATTERN = /(https:\/\/twitter.com\/([a-zA-Z0-9_]+\/)([a-zA-Z0-9_]+\/[a-zA-Z0-9_]+))/;

    constructor(app: App, settings: ReadItLaterSettings) {
        super(app, settings);
    }

    test(url: string): boolean {
        return this.isValidUrl(url) && this.PATTERN.test(url);
    }

    async prepareNote(url: string): Promise<Note> {
        const response = JSON.parse(
            await request({
                method: 'GET',
                contentType: 'application/json',
                url: `https://publish.twitter.com/oembed?url=${url}`,
            }),
        );

        const tweetAuthorName = response.author_name;
        const content = await parseHtmlContent(this.app, response.html, this.settings.assetsDir);

        const processedContent = this.settings.twitterNote
            .replace(/%tweetAuthorName%/g, tweetAuthorName)
            .replace(/%tweetURL%/g, response.url)
            .replace(/%tweetContent%/g, content);

        const fileName = `Tweet from ${tweetAuthorName} (${this.getFormattedDateForFilename()}).md`;

        return new Note(fileName, processedContent);
    }
}

export default TwitterParser;
