import { moment, request } from 'obsidian';
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

    test(url: string): boolean {
        return this.isValidUrl(url) && this.PATTERN.test(url);
    }

    async prepareNote(url: string): Promise<Note> {
        const createdAt = new Date();
        const twitterUrl = new URL(url);

        if (twitterUrl.hostname === 'x.com') {
            twitterUrl.hostname = 'twitter.com';
        }

        const data = await this.getTweetNoteData(twitterUrl, createdAt);

        const content = this.templateEngine.render(this.plugin.settings.twitterNote, data);

        const fileNameTemplate = this.templateEngine.render(this.plugin.settings.twitterNoteTitle, {
            tweetAuthorName: data.tweetAuthorName,
            date: this.getFormattedDateForFilename(createdAt),
        });

        return new Note(fileNameTemplate, 'md', content, this.plugin.settings.twitterContentTypeSlug, createdAt);
    }

    private async getTweetNoteData(url: URL, createdAt: Date): Promise<TweetNoteData> {
        const response = JSON.parse(
            await request({
                method: 'GET',
                contentType: 'application/json',
                url: `https://publish.twitter.com/oembed?url=${url.href}`,
            }),
        );

        const content = await parseHtmlContent(response.html);

        return {
            date: this.getFormattedDateForContent(createdAt),
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

        return date.isValid() ? date.format(this.plugin.settings.dateContentFmt) : '';
    }
}

export default TwitterParser;
