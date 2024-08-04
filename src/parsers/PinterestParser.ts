import { App, request } from 'obsidian';
import { ReadItLaterSettings } from '../settings';
import { Note } from './Note';
import { Parser } from './Parser';

interface PinterestUser {
    name: string;
    url: string;
}

interface PinterestImage {
    // https://gist.github.com/jpsirois/7001965
    x70: string;
    x192: string;
    x236: string;
    x736: string;
    x1200: string;
    originals: string;
}

interface PinterestPin {
    id: string;
    url: string;
    description: string;
    resource: string;

    author: PinterestUser;
    image: PinterestImage
}

class PinterestParser extends Parser {
    private PATTERN = /(pinterest\.com)\/pin\/\d+/;

    constructor(app: App, settings: ReadItLaterSettings) {
        super(app, settings);
    }

    test(clipboardContent: string): boolean | Promise<boolean> {
        return this.isValidUrl(clipboardContent) && this.PATTERN.test(clipboardContent);
    }

    async prepareNote(clipboardContent: string): Promise<Note> {
        const pinPage = await this.parseHtml(clipboardContent);
        

        const content = this.settings.pinterestNote
            .replace(/%date%/g, this.getFormattedDateForContent())
            .replace(/%videoDescription%/g, pinPage.description)
            .replace(/%videoId%/g, pinPage.id)
            .replace(/%videoURL%/g, pinPage.url)
            .replace(/%authorName%/g, pinPage.author.name)
            .replace(/%authorURL%/g, pinPage.author.url)
            .replace(/%img%/g, pinPage.image.originals)
            .replace(/%img1200%/g, pinPage.image.x1200)
            .replace(/%img736%/g, pinPage.image.x736)
            .replace(/%img236%/g, pinPage.image.x236)
            .replace(/%img192%/g, pinPage.image.x192)
            .replace(/%img70%/g, pinPage.image.x70);

        const fileNameTemplate = this.settings.pinterestNoteTitle
            .replace(/%authorName%/g, pinPage.author.name)
            .replace(/%date%/g, this.getFormattedDateForFilename());

        const fileName = `${fileNameTemplate}.md`;
        return new Note(fileName, content);
    }

    private async parseHtml(url: string): Promise<PinterestPin> {
        
        const response = await request({
            method: 'GET',
            url,
            headers: {
                'user-agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
            },
        });

        const html = new DOMParser().parseFromString(response, 'text/html');
        const videoRegexExec = this.PATTERN.exec(url);
        

        const imageUrlRAW = html.querySelector('[data-test-id="pin-closeup-image"] img')?.src;
        const imageUrl = imageUrlRAW.replace(/(.+\.com\/).+?(\/.+$)/,'$1{number}$2');

        debugger;

        return {
            id: videoRegexExec[4],
            url: html.querySelector('meta[property="og:url"]')?.getAttribute('content') ?? url,
            description: html.querySelector('meta[property="og:description"]')?.getAttribute('content') ?? '',
            resource: "...",
            author: {
                name: videoRegexExec[2],
                url: `https://www.tiktok.com/${videoRegexExec[2]}`,
            },
            image: {
                x70: imageUrl.replace("{number}", "70x"),
                x192: imageUrl.replace("{number}", "192x"),
                x236: imageUrl.replace("{number}", "236x"),
                x736: imageUrl.replace("{number}", "736x"),
                x1200: imageUrl.replace("{number}", "1200x"),
                originals: imageUrl.replace("{number}", "originals"),
            }
        };
    }
}

export default PinterestParser;
