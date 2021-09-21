import { addIcon, htmlToMarkdown, moment, normalizePath, Notice, Plugin, request } from 'obsidian';
import { Readability } from '@mozilla/readability';
import { getBaseUrl, isValidUrl, normalizeFilename } from './helper';
import { DEFAULT_SETTINGS, ReadItLaterSettings, ReadItLaterSettingsTab } from './settings';

export default class ReadItLaterPlugin extends Plugin {
    settings: ReadItLaterSettings;

    yt_regex_pattern = /(youtube.com|youtu.be)\/(watch)?(\?v=)?(\S+)?/;
    twitter_regex_pattern = /(https:\/\/twitter.com\/([a-zA-Z0-9_]+\/)([a-zA-Z0-9_]+\/[a-zA-Z0-9_]+))/;

    async onload(): Promise<void> {
        await this.loadSettings();

        if (!(await this.app.vault.adapter.exists(normalizePath(this.settings.inboxDir)))) {
            await this.app.vault.adapter.mkdir(normalizePath(this.settings.inboxDir));
        }

        addIcon('read-it-later', clipboardIcon);

        this.addRibbonIcon('read-it-later', 'ReadItLater: Save clipboard', async () => {
            await this.processClipboard();
        });

        this.addCommand({
            id: 'save-clipboard-to-notice',
            name: 'Save clipboard',
            callback: async () => {
                await this.processClipboard();
            },
        });

        this.addSettingTab(new ReadItLaterSettingsTab(this.app, this));
    }

    async loadSettings(): Promise<void> {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
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
        const dom = parser.parseFromString(response, 'text/html');

        // Set base to allow readability to resolve relative path's
        const baseEl = dom.createElement('base');
        baseEl.setAttribute('href', getBaseUrl(url));
        dom.head.append(baseEl);

        const article = new Readability(dom).parse();

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
            const fileName = `${article.title}.md`;

            content += `# [${article.title}](${url})\n\n`;
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
        fileName = normalizeFilename(fileName);
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

const clipboardIcon = `
<svg fill="currentColor" stroke="currentColor" version="1.1" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
	<g>
		<path d="m365.9,144.9c-12.3,0-24.2,1.8-35.4,5.2v-114.7h-96.9l7.3-35.4h-150.2l6.8,35.4h-97.5v454.6h330.5v-102.1c11.2,3.4 23.1,5.2 35.4,5.2 68.8-0.1 124.1-56.4 124.1-124.1 0-67.8-55.3-124.1-124.1-124.1zm-150.1-124l-10.4,50h-79.2l-9.4-50h99zm93.8,448.2h-288.7v-412.8h80.7l6.8,35.4h113.6l7.3-35.4h80.3v102.2c-27.3,14-48.8,37.9-59.7,66.7h-200.9v20.8h195c-1.4,7.4-2.2,15.1-2.2,22.9 0,13.4 2.2,26.4 6.2,38.6h-199v20.9h208.1c12,21.8 30.3,39.7 52.5,51.1v89.6zm56.3-98c-57.3,0-103.2-46.9-103.2-103.2s46.9-103.2 103.2-103.2c57.3,0 103.2,46.9 103.2,103.2s-45.8,103.2-103.2,103.2z"/>
		<polygon points="426.4,223.1 346.1,303.4 313.8,271.1 299.2,285.7 346.1,332.6 441,237.7   "/>
		<rect width="233.5" x="49" y="143.9" height="20.9"/>
		<rect width="233.5" x="49" y="388.9" height="20.9"/>
	</g>
</svg>`;
