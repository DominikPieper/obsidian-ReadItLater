import { App, request } from 'obsidian';
import TemplateEngine from 'src/template/TemplateEngine';
import { ReadItLaterSettings } from '../settings';
import { Note } from './Note';
import { Parser } from './Parser';

interface Schema {
    '@type': string;
}

interface Person extends Schema {
    name?: string;
    url?: string;
}

interface VideoObject extends Schema {
    author?: Person;
    embedUrl?: string;
    name?: string;
    url?: string;
}

interface VimeoNoteData {
    date: string;
    videoId: string;
    videoTitle: string;
    videoURL: string;
    videoPlayer: string;
    channelName: string;
    channelURL: string;
}

class VimeoParser extends Parser {
    private PATTERN = /(vimeo.com)\/(\d+)?/;

    constructor(app: App, settings: ReadItLaterSettings, templateEngine: TemplateEngine) {
        super(app, settings, templateEngine);
    }

    test(clipboardContent: string): boolean | Promise<boolean> {
        return this.isValidUrl(clipboardContent) && this.PATTERN.test(clipboardContent);
    }

    async prepareNote(clipboardContent: string): Promise<Note> {
        const createdAt = new Date();
        const data = await this.parseSchema(clipboardContent, createdAt);

        const content = this.templateEngine.render(this.settings.vimeoNote, data);

        const fileNameTemplate = this.templateEngine.render(this.settings.vimeoNoteTitle, {
            title: data.videoTitle,
            date: this.getFormattedDateForFilename(createdAt),
        });

        return new Note(fileNameTemplate, 'md', content, this.settings.vimeoContentTypeSlug, createdAt);
    }

    private async parseSchema(url: string, createdAt: Date): Promise<VimeoNoteData> {
        const response = await request({
            method: 'GET',
            url,
            headers: {
                'user-agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
            },
        });

        const videoHTML = new DOMParser().parseFromString(response, 'text/html');
        const schemaElement = videoHTML.querySelector('script[type="application/ld+json"]');
        const schema: [VideoObject, Schema] = JSON.parse(schemaElement.textContent);
        const videoSchema = schema[0];
        const videoIdRegexExec = this.PATTERN.exec(url);

        return {
            date: this.getFormattedDateForContent(createdAt),
            videoId: videoIdRegexExec.length === 3 ? videoIdRegexExec[2] : '',
            videoURL: videoSchema?.url ?? '',
            videoTitle: videoSchema?.name ?? '',
            videoPlayer: `<iframe width="${this.settings.vimeoEmbedWidth}" height="${this.settings.vimeoEmbedHeight}" src="${videoSchema?.embedUrl}" title="Vimeo video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`,
            channelName: videoSchema?.author?.name ?? '',
            channelURL: videoSchema?.author?.url ?? '',
        };
    }
}

export default VimeoParser;
