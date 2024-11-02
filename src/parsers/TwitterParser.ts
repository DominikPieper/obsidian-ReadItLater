import { App, moment, request } from 'obsidian';
import TemplateEngine from 'src/template/TemplateEngine';
import { ReadItLaterSettings } from '../settings';
import { Parser } from './Parser';
import { Note } from './Note';
import { parseHtmlContent } from './parsehtml';

interface TweetNoteData {
    date: string;
    tweetAuthorName: string;
    tweetURL: string;
    tweetContent: string;
    tweetPublishDate: string;
}

class TwitterParser extends Parser {
    private PATTERN = /(https:\/\/(twitter|x).com\/([a-zA-Z0-9_]+\/)([a-zA-Z0-9_]+\/[a-zA-Z0-9_]+))/;

    constructor(app: App, settings: ReadItLaterSettings, templateEngine: TemplateEngine) {
        super(app, settings, templateEngine);
    }

    test(url: string): boolean {
        return this.isValidUrl(url) && this.PATTERN.test(url);
    }

    async prepareNote(url: string): Promise<Note> {
        const twitterUrl = new URL(url);

        if (twitterUrl.hostname === 'x.com') {
            twitterUrl.hostname = 'twitter.com';
        }

        const data = await this.getTweetNoteData(twitterUrl);

        const content = this.templateEngine.render(this.settings.twitterNote, data);

        const fileNameTemplate = this.templateEngine.render(this.settings.twitterNoteTitle, {
            tweetAuthorName: data.tweetAuthorName,
            date: this.getFormattedDateForFilename(),
        });

        const fileName = `${fileNameTemplate}.md`;

        return new Note(fileName, content);
    }

    private async getTweetNoteData(url: URL): Promise<TweetNoteData> {
        const response = JSON.parse(
            await request({
                method: 'GET',
                contentType: 'application/json',
                url: `https://publish.twitter.com/oembed?url=${url.href}`,
            }),
        );

        const content = await parseHtmlContent(response.html);

        return {
            date: this.getFormattedDateForContent(),
            tweetAuthorName: response.author_name,
            tweetURL: response.url,
            tweetContent: content,
            tweetPublishDate: this.getPublishedDateFromDOM(response.html),
        };
    }

    private getPublishedDateFromDOM(html: string): string {
        const dom = new DOMParser().parseFromString(html, 'text/html');
        const dateElement = dom.querySelector('blockquote > a');
        const date = moment(dateElement.textContent);

        return date.isValid() ? date.format(this.settings.dateContentFmt) : '';
    }
}

export default TwitterParser;
