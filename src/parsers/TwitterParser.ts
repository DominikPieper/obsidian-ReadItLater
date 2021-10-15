import { Parser } from './Parser';
import { ReadItLaterSettings } from '../settings';
import { request } from 'obsidian';
import { Note } from './Note';

class TwitterParser extends Parser {
    private PATTERN = /(https:\/\/twitter.com\/([a-zA-Z0-9_]+\/)([a-zA-Z0-9_]+\/[a-zA-Z0-9_]+))/;

    constructor(settings: ReadItLaterSettings) {
        super(settings);
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

        const content = this.settings.twitterNote
            .replace('%tweetAuthorName%', tweetAuthorName)
            .replace('%tweetURL%', response.url)
            .replace('%tweetContent%', response.html);

        const fileName = `Tweet from ${tweetAuthorName} (${this.getFormattedDateForFilename()}).md`;

        return new Note(fileName, content);
    }
}

export default TwitterParser;
