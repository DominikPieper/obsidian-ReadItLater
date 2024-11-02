import { App, request } from 'obsidian';
import { ReadItLaterSettings } from '../settings';
import { Note } from './Note';
import { Parser } from './Parser';

interface TikTokUser {
    name: string;
    url: string;
}

interface TikTokVideo {
    id: string;
    url: string;
    description: string;
    player: string;
    author: TikTokUser;
}

class TikTokParser extends Parser {
    private PATTERN = /(tiktok.com)\/(\S+)\/(video)\/(\d+)/;

    constructor(app: App, settings: ReadItLaterSettings) {
        super(app, settings);
    }

    test(clipboardContent: string): boolean | Promise<boolean> {
        return this.isValidUrl(clipboardContent) && this.PATTERN.test(clipboardContent);
    }

    async prepareNote(clipboardContent: string): Promise<Note> {
        const video = await this.parseHtml(clipboardContent);

        const content = this.settings.tikTokNote
            .replace(/%date%/g, this.getFormattedDateForContent())
            .replace(/%videoDescription%/g, () => video.description)
            .replace(/%videoId%/g, () => video.id)
            .replace(/%videoURL%/g, () => video.url)
            .replace(/%authorName%/g, () => video.author.name)
            .replace(/%authorURL%/g, () => video.author.url)
            .replace(/%videoPlayer%/g, () => video.player);

        const fileNameTemplate = this.settings.tikTokNoteTitle
            .replace(/%authorName%/g, () => video.author.name)
            .replace(/%date%/g, this.getFormattedDateForFilename());

        const fileName = `${fileNameTemplate}.md`;
        return new Note(fileName, content);
    }

    private async parseHtml(url: string): Promise<TikTokVideo> {
        const response = await request({
            method: 'GET',
            url,
            headers: {
                'user-agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
            },
        });

        const videoHTML = new DOMParser().parseFromString(response, 'text/html');
        const videoRegexExec = this.PATTERN.exec(url);

        return {
            id: videoRegexExec[4],
            url: videoHTML.querySelector('meta[property="og:url"]')?.getAttribute('content') ?? url,
            description: videoHTML.querySelector('meta[property="og:description"]')?.getAttribute('content') ?? '',
            player: `<iframe width="${this.settings.tikTokEmbedWidth}" height="${this.settings.tikTokEmbedHeight}" src="https://www.tiktok.com/embed/v2/${videoRegexExec[4]}"></iframe>`,
            author: {
                name: videoRegexExec[2],
                url: `https://www.tiktok.com/${videoRegexExec[2]}`,
            },
        };
    }
}

export default TikTokParser;
