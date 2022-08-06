import { ReadItLaterSettings } from '../settings';
import { App, request } from 'obsidian';
import { Note } from './Note';
import { Parser } from './Parser';

class BilibiliParser extends Parser {
    private PATTERN = /(bilibili.com)\/(video)?\/([a-z0-9]+)?/i;

    constructor(app: App, settings: ReadItLaterSettings) {
        super(app, settings);
    }

    test(url: string): boolean {
        return this.isValidUrl(url) && this.PATTERN.test(url);
    }

    async prepareNote(url: string): Promise<Note> {
        const response = await request({
            method: 'GET',
            url,
            headers: {
                'user-agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
            },
        });
        const videoHTML = new DOMParser().parseFromString(response, 'text/html');
        const videoTitle = videoHTML.querySelector("[property~='og:title']").getAttribute('content');
        const videoId = this.PATTERN.exec(url)[3];
        const videoPlayer = `<iframe width="560" height="315" src="https://player.bilibili.com/player.html?bvid=${videoId}" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"></iframe>`;

        const content = this.settings.bilibiliNote
            .replace(/%date%/g, this.getFormattedDateForContent())
            .replace(/%videoTitle%/g, videoTitle)
            .replace(/%videoURL%/g, url)
            .replace(/%videoId%/g, videoId)
            .replace(/%videoPlayer%/g, videoPlayer);

        const fileNameTemplate = this.settings.bilibiliNoteTitle
            .replace(/%title%/g, videoTitle)
            .replace(/%date%/g, this.getFormattedDateForFilename());
        const fileName = `${fileNameTemplate}.md`;
        return new Note(fileName, content);
    }
}

export default BilibiliParser;
