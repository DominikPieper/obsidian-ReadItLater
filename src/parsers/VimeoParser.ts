import { App, request } from 'obsidian';
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

interface VimeoVideo {
    id: string;
    url: string;
    title: string;
    player: string;
    channel: VimeoChannel;
}

interface VimeoChannel {
    name: string;
    url: string;
}

class VimeoParser extends Parser {
    private PATTERN = /(vimeo.com)\/(\d+)?/;

    constructor(app: App, settings: ReadItLaterSettings) {
        super(app, settings);
    }

    test(clipboardContent: string): boolean | Promise<boolean> {
        return this.isValidUrl(clipboardContent) && this.PATTERN.test(clipboardContent);
    }

    async prepareNote(clipboardContent: string): Promise<Note> {
        const video = await this.parseSchema(clipboardContent);

        const content = this.settings.vimeoNote
            .replace(/%date%/g, this.getFormattedDateForContent())
            .replace(/%videoTitle%/g, video.title)
            .replace(/%videoId%/g, video.id)
            .replace(/%videoURL%/g, video.url)
            .replace(/%channelName%/g, video.channel.name)
            .replace(/%channelURL%/g, video.channel.url)
            .replace(/%videoPlayer%/g, video.player);

        const fileNameTemplate = this.settings.vimeoNoteTitle
            .replace(/%title%/g, video.title)
            .replace(/%date%/g, this.getFormattedDateForFilename());

        const fileName = `${fileNameTemplate}.md`;
        return new Note(fileName, content);
    }

    private async parseSchema(url: string): Promise<VimeoVideo> {
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
            id: videoIdRegexExec.length === 3 ? videoIdRegexExec[2] : '',
            url: videoSchema?.url ?? '',
            title: videoSchema?.name ?? '',
            player: `<iframe width="560" height="315" src="${videoSchema?.embedUrl}" title="Vimeo video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`,
            channel: {
                name: videoSchema?.author?.name ?? '',
                url: videoSchema?.author?.url ?? '',
            },
        };
    }
}

export default VimeoParser;
