import { App, request } from 'obsidian';
import { ReadItLaterSettings } from '../settings';
import { Parser } from './Parser';
import { Note } from './Note';
import { parseHtmlContent } from './parsehtml';

class TwitterParser extends Parser {
    private PATTERN = /(https:\/\/(twitter|x).com\/([a-zA-Z0-9_]+\/)([a-zA-Z0-9_]+\/[a-zA-Z0-9_]+))/;

    constructor(app: App, settings: ReadItLaterSettings) {
        super(app, settings);
    }

    test(url: string): boolean {
        return this.isValidUrl(url) && this.PATTERN.test(url);
    }

    async prepareNote(url: string): Promise<Note> {
        const twitterUrl = new URL(url);

        if (twitterUrl.hostname === 'x.com') {
            twitterUrl.hostname = 'twitter.com';
        }

        const response = JSON.parse(
            await request({
                method: 'GET',
                contentType: 'application/json',
                url: `https://publish.twitter.com/oembed?url=${twitterUrl.href}`,
            }),
        );

        const tweetAuthorName = response.author_name;
        const content = await parseHtmlContent(response.html);

        const processedContent = this.settings.twitterNote
            .replace(/%date%/g, this.getFormattedDateForContent())
            .replace(/%tweetAuthorName%/g, tweetAuthorName)
            .replace(/%tweetURL%/g, response.url)
            .replace(/%tweetContent%/g, content);

        const fileNameTemplate = this.settings.twitterNoteTitle
            .replace(/%tweetAuthorName%/g, tweetAuthorName)
            .replace(/%date%/g, this.getFormattedDateForFilename());

        const fileName = `${fileNameTemplate}.md`;

        return new Note(fileName, processedContent);
    }
}

export default TwitterParser;
