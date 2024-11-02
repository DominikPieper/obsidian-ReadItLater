import { App, moment, request } from 'obsidian';
import { Duration, parse, toSeconds } from 'iso8601-duration';
import TemplateEngine from 'src/template/TemplateEngine';
import { ReadItLaterSettings } from '../settings';
import { handleError } from '../helpers';
import { Note } from './Note';
import { Parser } from './Parser';

interface YoutubeNoteData {
    date: string;
    videoId: string;
    videoTitle: string;
    videoDescription: string;
    videoThumbnail: string;
    videoDuration: Number;
    videoDurationFormatted: string;
    videoPublishDate: string;
    videoViewsCount: Number;
    videoURL: string;
    videoTags: string;
    videoPlayer: string;
    channelId: string;
    channelName: string;
    channelURL: string;
    extra: YoutubeVideo;
}

interface YoutubeVideo {
    thumbnails: GoogleApiYouTubeThumbnailResource;
    publishedAt: Date;
    tags: string[];
    channel: YoutubeChannel;
}

interface YoutubeChannel {
    thumbnails: GoogleApiYouTubeThumbnailResource;
}

class YoutubeParser extends Parser {
    private PATTERN = /(youtube.com|youtu.be)\/(watch|shorts)?(\?v=|\/)?([^&#?]*)/;

    constructor(app: App, settings: ReadItLaterSettings, templateEngine: TemplateEngine) {
        super(app, settings, templateEngine);
    }

    test(url: string): boolean {
        return this.isValidUrl(url) && this.PATTERN.test(url);
    }

    async prepareNote(url: string): Promise<Note> {
        const data =
            this.settings.youtubeApiKey === '' ? await this.parseSchema(url) : await this.parseApiResponse(url);

        const content = this.templateEngine.render(this.settings.youtubeNote, data);

        const fileNameTemplate = this.templateEngine.render(this.settings.youtubeNoteTitle, {
            title: data.videoTitle,
            date: this.getFormattedDateForFilename(),
        });

        const fileName = `${fileNameTemplate}.md`;
        return new Note(fileName, content);
    }

    private async parseApiResponse(url: string): Promise<YoutubeNoteData> {
        const videoId = this.PATTERN.exec(url)[4];
        try {
            const videoApiResponse = await request({
                method: 'GET',
                url: `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet,statistics,status,topicDetails&id=${videoId}&key=${this.settings.youtubeApiKey}`,
                headers: {
                    Accept: 'application/json',
                },
            });

            const videoJsonResponse = JSON.parse(videoApiResponse);
            if (videoJsonResponse.items.length === 0) {
                throw new Error(`Video (${url}) cannot be fetched from API`);
            }
            const video: GoogleApiYouTubeVideoResource = videoJsonResponse.items[0];

            const channelApiResponse = await request({
                method: 'GET',
                url: `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&id=${video.snippet.channelId}&key=${this.settings.youtubeApiKey}`,
                headers: {
                    Accept: 'application/json',
                },
            });
            const channelJsonResponse = JSON.parse(channelApiResponse);
            if (channelJsonResponse.items.length === 0) {
                throw new Error(`Channel (${video.snippet.channelId}) cannot be fetched from API`);
            }
            const channel: GoogleApiYouTubeChannelResource = channelJsonResponse.items[0];

            const duration = parse(video.contentDetails.duration);

            const tags: string[] = Object.prototype.hasOwnProperty.call(video, 'tags')
                ? video.snippet.tags.map((tag) => tag.replace(/[\s:\-_.]/g, '').replace(/^/, '#'))
                : [];

            return {
                date: this.getFormattedDateForContent(),
                videoId: video.id,
                videoURL: url,
                videoTitle: video.snippet.title,
                videoDescription: video.snippet.description,
                videoThumbnail:
                    video.snippet.thumbnails?.maxres?.url ??
                    video.snippet.thumbnails?.medium?.url ??
                    video.snippet.thumbnails?.default?.url ??
                    '',
                videoPlayer: this.getEmbedPlayer(video.id),
                videoDuration: toSeconds(duration),
                videoDurationFormatted: this.formatDuration(duration),
                videoPublishDate: moment(video.snippet.publishedAt).format(this.settings.dateContentFmt),
                videoViewsCount: video.statistics.viewCount,
                videoTags: tags.join(' '),
                channelId: channel.id,
                channelURL: `https://www.youtube.com/channel/${channel.id}`,
                channelName: channel.snippet.title ?? '',
                extra: {
                    thumbnails: video.snippet.thumbnails,
                    publishedAt: moment(video.snippet.publishedAt).toDate(),
                    tags: tags,
                    channel: {
                        thumbnails: channel.snippet.thumbnails,
                    },
                },
            };
        } catch (e) {
            handleError(e);
        }
    }

    private async parseSchema(url: string): Promise<YoutubeNoteData> {
        try {
            const response = await request({
                method: 'GET',
                url,
                headers: {
                    'user-agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                },
            });

            const videoHTML = new DOMParser().parseFromString(response, 'text/html');
            const videoSchemaElement = videoHTML.querySelector('[itemtype*="http://schema.org/VideoObject"]');

            if (videoSchemaElement === null) {
                throw new Error('Unable to find Schema.org element in HTML.');
            }

            const videoId = videoSchemaElement?.querySelector('[itemprop="identifier"]')?.getAttribute('content') ?? '';
            const personSchemaElement = videoSchemaElement.querySelector('[itemtype="http://schema.org/Person"]');

            return {
                date: this.getFormattedDateForContent(),
                videoId: videoId,
                videoURL: url,
                videoTitle: videoSchemaElement?.querySelector('[itemprop="name"]')?.getAttribute('content') ?? '',
                videoDescription:
                    videoSchemaElement?.querySelector('[itemprop="description"]')?.getAttribute('content') ?? '',
                videoThumbnail: videoHTML.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? '',
                videoPlayer: this.getEmbedPlayer(videoId),
                videoDuration: 0,
                videoDurationFormatted: '',
                videoPublishDate: '',
                videoViewsCount: 0,
                videoTags: '',
                channelId: videoSchemaElement?.querySelector('[itemprop="channelId"')?.getAttribute('content') ?? '',
                channelURL: personSchemaElement?.querySelector('[itemprop="url"]')?.getAttribute('href') ?? '',
                channelName: personSchemaElement?.querySelector('[itemprop="name"]')?.getAttribute('content') ?? '',
                extra: null,
            };
        } catch (e) {
            handleError(e);
        }
    }

    private formatDuration(duration: Duration): string {
        let formatted: string = '';

        if (duration.years > 0) {
            formatted = formatted.concat(' ', `${duration.years}y`);
        }

        if (duration.months > 0) {
            formatted = formatted.concat(' ', `${duration.months}m`);
        }

        if (duration.weeks > 0) {
            formatted = formatted.concat(' ', `${duration.weeks}w`);
        }

        if (duration.days > 0) {
            formatted = formatted.concat(' ', `${duration.days}d`);
        }

        if (duration.hours > 0) {
            formatted = formatted.concat(' ', `${duration.hours}h`);
        }

        if (duration.minutes > 0) {
            formatted = formatted.concat(' ', `${duration.minutes}m`);
        }

        if (duration.seconds > 0) {
            formatted = formatted.concat(' ', `${duration.seconds}s`);
        }

        return formatted.trim();
    }

    private getEmbedPlayer(videoId: string): string {
        const domain = this.settings.youtubeUsePrivacyEnhancedEmbed ? 'youtube-nocookie.com' : 'youtube.com';
        return `<iframe width="${this.settings.youtubeEmbedWidth}" height="${this.settings.youtubeEmbedHeight}" src="https://www.${domain}/embed/${videoId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    }
}

export default YoutubeParser;
