import { Notice, request, normalizePath, App, htmlToMarkdown } from 'obsidian';
import { Readability } from '@mozilla/readability';
import moment from 'moment';
import { isValidUrl } from './helper';
import { ReadItLaterSettings } from './settings';

export default class ContentConverter {
    app: App;
    settings: ReadItLaterSettings;

    yt_regex_pattern = /(youtube.com|youtu.be)\/(watch)?(\?v=)?(\S+)?/;
    twitter_regex_pattern = /(https:\/\/twitter.com\/([a-zA-Z0-9_]+\/)([a-zA-Z0-9_]+\/[a-zA-Z0-9_]+))/;

    constructor(app: App, settings: ReadItLaterSettings) {
        this.app = app;
        this.settings = settings;
    }

    async processClipboard(): Promise<void> {
        const clipbardContent = await navigator.clipboard.readText();

        if (isValidUrl(clipbardContent)) {
            if (this.yt_regex_pattern.test(clipbardContent)) {
                await this.processYoutubeLink(clipbardContent);
            } else if (this.twitter_regex_pattern.test(clipbardContent)) {
                await this.processTweet(clipbardContent);
            } else {
                await this.processWebsite(clipbardContent);
            }
        } else {
            await this.createTextSnippet(clipbardContent);
        }
    }

    async processWebsite(url: string): Promise<void> {
        const response = await request({
            method: 'GET',
            url: url,
        });

        const parser = new DOMParser();
        const doc = parser.parseFromString(response, 'text/html');
        const article = new Readability(doc).parse();

        let content = '';
        if (!this.settings.preventTags) {
            content += '[[ReadItLater]]';
            if (this.settings.articleDefaultTag) {
                content += ` [[${this.settings.articleDefaultTag}]]\n\n`;
            } else {
                content += '\n\n';
            }
        }

        if (article?.content) {
            if (!article.title) {
                article.title = 'No title';
            }
            article.title = article.title.replace(':', ' ');
            const fileName = `${article.title}.md`;

            content += htmlToMarkdown(article.content);

            await this.writeFile(fileName, content);
        } else {
            console.error('Website not parseable');

            const fileName = `Article (${this.getFormattedDateForFilename()}).md`;
            content += `[${url}](${url})`;
            await this.writeFile(fileName, content);
        }
    }

    async createTextSnippet(snippet: string): Promise<void> {
        const fileName = `Notice ${this.getFormattedDateForFilename()}.md`;

        let content = '';
        if (!this.settings.preventTags) {
            content += '[[ReadItLater]]';
            if (this.settings.textsnippetDefaultTag) {
                content += ` [[${this.settings.textsnippetDefaultTag}]]\n\n`;
            } else {
                content += '\n\n';
            }
        }
        content += snippet;

        await this.writeFile(fileName, content);
    }

    async processYoutubeLink(url: string): Promise<void> {
        const response = await request({
            method: 'GET',
            url: url,
        });
        const parser = new DOMParser();
        const doc = parser.parseFromString(response, 'text/html');
        const ytVideoId = this.yt_regex_pattern.exec(url)[4];

        let content = '';
        if (!this.settings.preventTags) {
            content += '[[ReadItLater]]';
            if (this.settings.youtubeDefaultTag) {
                content += ` [[${this.settings.youtubeDefaultTag}]]\n\n`;
            } else {
                content += '\n\n';
            }
        }
        content += `# [${doc.title}](${url})\n\n`;
        content += `<iframe width="560" height="315" src="https://www.youtube.com/embed/${ytVideoId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;

        const fileName = `Youtube - ${doc.title}.md`;
        await this.writeFile(fileName, content);
    }

    async processTweet(url: string): Promise<void> {
        const response = JSON.parse(
            await request({
                method: 'GET',
                contentType: 'application/json',
                url: `https://publish.twitter.com/oembed?url=${url}`,
            }),
        );

        const fileName = `Tweet from ${response.author_name} (${this.getFormattedDateForFilename()}}).md`;

        let content = '';
        if (!this.settings.preventTags) {
            content += '[[ReadItLater]]';
            if (this.settings.twitterDefaultTag) {
                content += ` [[${this.settings.twitterDefaultTag}]]\n\n`;
            } else {
                content += '\n\n';
            }
        }
        content = `# [${response.author_name}](${response.url})\n\n`;
        content += response.html;

        await this.writeFile(fileName, content);
    }

    async writeFile(fileName: string, content: string): Promise<void> {
        let filePath;
        if (this.settings.inboxDir) {
            filePath = normalizePath(`${this.settings.inboxDir}/${fileName}`);
        } else {
            filePath = normalizePath(`/${fileName}`);
        }

        if (await this.app.vault.adapter.exists(filePath)) {
            new Notice(`${fileName} already exists!`);
        } else {
            this.app.vault.create(filePath, content);
            new Notice(`${fileName} created successful`);
        }
    }

    private getFormattedDateForFilename(): string {
        const date = new Date();
        return moment(date).format('YYYY-MM-DD HH-mm-ss');
    }
}
