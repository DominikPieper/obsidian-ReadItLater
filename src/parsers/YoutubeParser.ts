import { ReadItLaterSettings } from '../settings';
import { App, request } from 'obsidian';
import { Note } from './Note';
import { Parser } from './Parser';

class YoutubeParser extends Parser {
    private PATTERN = /(youtube.com|youtu.be)\/(watch)?(\?v=)?(\S+)?/;

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
        const videoId = this.PATTERN.exec(url)[4];
        const videoPlayer = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;

        const content = this.settings.youtubeNote
            .replace(/%date%/g, this.getFormattedDateForContent())
            .replace(/%videoTitle%/g, videoTitle)
            .replace(/%videoURL%/g, url)
            .replace(/%videoId%/g, videoId)
            .replace(/%videoPlayer%/g, videoPlayer);

        const fileNameTemplate = this.settings.youtubeNoteTitle
            .replace(/%title%/g, videoTitle)
            .replace(/%date%/g, this.getFormattedDateForFilename());

        const fileName = `${fileNameTemplate}.md`;
        return new Note(fileName, content);
    }
}

export default YoutubeParser;
