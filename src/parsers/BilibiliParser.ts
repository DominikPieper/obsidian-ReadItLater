import { App, request } from 'obsidian';
import TemplateEngine from 'src/template/TemplateEngine';
import { ReadItLaterSettings } from '../settings';
import { Note } from './Note';
import { Parser } from './Parser';

interface BilibiliNoteData {
    date: string;
    videoId: string;
    videoTitle: string;
    videoURL: string;
    videoPlayer: string;
}

class BilibiliParser extends Parser {
    private PATTERN = /(bilibili.com)\/(video)?\/([a-z0-9]+)?/i;

    constructor(app: App, settings: ReadItLaterSettings, templateEngine: TemplateEngine) {
        super(app, settings, templateEngine);
    }

    test(url: string): boolean {
        return this.isValidUrl(url) && this.PATTERN.test(url);
    }

    async prepareNote(url: string): Promise<Note> {
        const createdAt = new Date();
        const data = await this.getNoteData(url, createdAt);

        const content = this.templateEngine.render(this.settings.bilibiliNote, data);

        const fileNameTemplate = this.templateEngine.render(this.settings.bilibiliNoteTitle, {
            title: data.videoTitle,
            date: this.getFormattedDateForFilename(createdAt),
        });

        return new Note(fileNameTemplate, 'md', content, this.settings.bilibiliContentTypeSlug, createdAt);
    }

    private async getNoteData(url: string, createdAt: Date): Promise<BilibiliNoteData> {
        const response = await request({
            method: 'GET',
            url,
            headers: {
                'user-agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
            },
        });
        const videoHTML = new DOMParser().parseFromString(response, 'text/html');
        const videoId = this.PATTERN.exec(url)[3] ?? '';

        return {
            date: this.getFormattedDateForContent(createdAt),
            videoId: videoId,
            videoTitle: videoHTML.querySelector("[property~='og:title']").getAttribute('content') ?? '',
            videoURL: url,
            videoPlayer: `<iframe width="${this.settings.bilibiliEmbedWidth}" height="${this.settings.bilibiliEmbedHeight}" src="https://player.bilibili.com/player.html?autoplay=0&bvid=${videoId}" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"></iframe>`,
        };
    }
}

export default BilibiliParser;
