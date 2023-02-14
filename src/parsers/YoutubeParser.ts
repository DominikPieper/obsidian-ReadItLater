import { App, request } from 'obsidian';
import { ReadItLaterSettings } from '../settings';
import { Note } from './Note';
import { Parser } from './Parser';

interface YoutubeVideo {
    id: string;
    url: string;
    title: string;
    player: string;
    channel: YoutubeChannel;
}

interface YoutubeChannel {
    id: string;
    url: string;
    name: string;
}

class YoutubeParser extends Parser {
    private PATTERN = /(youtube.com|youtu.be)\/(watch|shorts)?(\?v=|\/)?(\S+)?/;

    constructor(app: App, settings: ReadItLaterSettings) {
        super(app, settings);
    }

    test(url: string): boolean {
        return this.isValidUrl(url) && this.PATTERN.test(url);
    }

    async prepareNote(url: string): Promise<Note> {
        const video = await this.parseSchema(url);

        const content = this.settings.youtubeNote
            .replace(/%date%/g, this.getFormattedDateForContent())
            .replace(/%videoTitle%/g, video.title)
            .replace(/%videoId%/g, video.id)
            .replace(/%videoURL%/g, video.url)
            .replace(/%channelId%/g, video.channel.id)
            .replace(/%channelName%/g, video.channel.name)
            .replace(/%channelURL%/g, video.channel.url)
            .replace(/%videoPlayer%/g, video.player);

        const fileNameTemplate = this.settings.youtubeNoteTitle
            .replace(/%title%/g, video.title)
            .replace(/%date%/g, this.getFormattedDateForFilename());

        const fileName = `${fileNameTemplate}.md`;
        return new Note(fileName, content);
    }

    private async parseSchema(url: string): Promise<YoutubeVideo> {
        const response = await request({
            method: 'GET',
            url,
            headers: {
                'user-agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
            },
        });

        const videoHTML = new DOMParser().parseFromString(response, 'text/html');
        const videoSchemaElement = videoHTML.querySelector('[itemtype="http://schema.org/VideoObject"]');
        const videoId = videoSchemaElement?.querySelector('[itemprop="videoId"]')?.getAttribute('content') ?? '';
        const personSchemaElement = videoSchemaElement.querySelector('[itemtype="http://schema.org/Person"]');
        const videoPlayer = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;

        return {
            id: videoId,
            url: url,
            title: videoSchemaElement?.querySelector('[itemprop="name"]')?.getAttribute('content') ?? '',
            player: videoPlayer,
            channel: {
                id: videoSchemaElement?.querySelector('[itemprop="channelId"')?.getAttribute('content') ?? '',
                url: personSchemaElement?.querySelector('[itemprop="url"]')?.getAttribute('href') ?? '',
                name: personSchemaElement?.querySelector('[itemprop="name"]')?.getAttribute('content') ?? '',
            },
        };
    }
}

export default YoutubeParser;
