import { moment, request } from 'obsidian';
import { Duration, parse, toSeconds } from 'iso8601-duration';
import { handleError } from 'src/helpers/error';
import { getJavascriptDeclarationByName } from 'src/helpers/domUtils';
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
    videoChapters: string;
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
    chapters: YoutubeVideoChapter[];
}

interface YoutubeVideoChapter {
    timestamp: string;
    title: string;
    seconds: number;
}

interface YoutubeChannel {
    thumbnails: GoogleApiYouTubeThumbnailResource;
}

class YoutubeParser extends Parser {
    private PATTERN =
        /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]+)(?:\?([^&\s]+(?:&[^&\s]+)*))?$/;

    test(url: string): boolean {
        return this.isValidUrl(url) && this.PATTERN.test(url);
    }

    async prepareNote(url: string): Promise<Note> {
        const createdAt = new Date();
        const data =
            this.plugin.settings.youtubeApiKey === ''
                ? await this.parseSchema(url, createdAt)
                : await this.parseApiResponse(url, createdAt);

        const content = this.templateEngine.render(this.plugin.settings.youtubeNote, data);

        const fileNameTemplate = this.templateEngine.render(this.plugin.settings.youtubeNoteTitle, {
            title: data.videoTitle,
            date: this.getFormattedDateForFilename(createdAt),
        });

        return new Note(fileNameTemplate, 'md', content, this.plugin.settings.youtubeContentTypeSlug, createdAt);
    }

    private async parseApiResponse(url: string, createdAt: Date): Promise<YoutubeNoteData> {
        const videoId = this.PATTERN.exec(url)[1];
        try {
            const videoApiResponse = await request({
                method: 'GET',
                url: `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet,statistics,status,topicDetails&id=${videoId}&key=${this.plugin.settings.youtubeApiKey}`,
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
                url: `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&id=${video.snippet.channelId}&key=${this.plugin.settings.youtubeApiKey}`,
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

            const tags: string[] = video.snippet?.tags.map((tag) => tag.replace(/[\s:\-_.]/g, '').replace(/^/, '#')) ?? [];

            const chapters = this.getVideoChapters(video.snippet.description);

            return {
                date: this.getFormattedDateForContent(createdAt),
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
                videoPublishDate: moment(video.snippet.publishedAt).format(this.plugin.settings.dateContentFmt),
                videoViewsCount: video.statistics.viewCount,
                videoTags: tags.join(' '),
                videoChapters: this.formatVideoChapters(video.id, chapters),
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
                    chapters: chapters,
                },
            };
        } catch (e) {
            handleError(e);
        }
    }

    private async parseSchema(url: string, createdAt: Date): Promise<YoutubeNoteData> {
        try {
            const response = await request({
                method: 'GET',
                url,
                headers: {
                    'user-agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                },
            });

            const videoHTML = new DOMParser().parseFromString(response, 'text/html');

            const declaration = getJavascriptDeclarationByName('ytInitialDataa', videoHTML.querySelectorAll('script'));
            const jsonData = typeof declaration !== 'undefined' ? JSON.parse(declaration.value) : {};

            const videoSchemaElement = videoHTML.querySelector('[itemtype*="http://schema.org/VideoObject"]');

            if (videoSchemaElement === null) {
                throw new Error('Unable to find Schema.org element in HTML.');
            }

            const videoId = videoSchemaElement?.querySelector('[itemprop="identifier"]')?.getAttribute('content') ?? '';
            const personSchemaElement = videoSchemaElement.querySelector('[itemtype="http://schema.org/Person"]');

            const description =
                jsonData?.contents?.twoColumnWatchNextResults?.results?.results?.contents?.[1]
                    ?.videoSecondaryInfoRenderer?.attributedDescription?.content ??
                videoSchemaElement?.querySelector('[itemprop="description"]')?.getAttribute('content') ??
                '';
            const chapters = this.getVideoChapters(description);
            const publishedAt = jsonData?.engagementPanels?.[5]?.engagementPanelSectionListRenderer?.content?.structuredDescriptionContentRenderer?.items?.[0]?.videoDescriptionHeaderRenderer?.publishDate?.simpleText ?? '';
            const videoViewsCount = jsonData?.contents?.twoColumnWatchNextResults?.results?.results?.contents?.[0]?.videoPrimaryInfoRenderer?.viewCount?.videoViewCountRenderer?.originalViewCount ?? 0;

            return {
                date: this.getFormattedDateForContent(createdAt),
                videoId: videoId,
                videoURL: url,
                videoTitle: videoSchemaElement?.querySelector('[itemprop="name"]')?.getAttribute('content') ?? '',
                videoDescription: description,
                videoThumbnail: videoHTML.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? '',
                videoPlayer: this.getEmbedPlayer(videoId),
                videoDuration: 0,
                videoDurationFormatted: '',
                videoPublishDate: publishedAt !== '' ? moment(publishedAt).format(this.plugin.settings.dateContentFmt) : '',
                videoViewsCount: videoViewsCount,
                videoTags: '',
                videoChapters: this.formatVideoChapters(videoId, chapters),
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

    private formatVideoChapters(videoId: string, chapters: YoutubeVideoChapter[]): string {
        return chapters
            .map((chapter) => {
                return `- [${chapter.timestamp}](https://www.youtube.com/watch?v=${videoId}&t=${chapter.seconds}) ${chapter.title}`;
            })
            .join('\n');
    }

    private getVideoChapters(description: string): YoutubeVideoChapter[] {
        const chapterRegex = /^((?:\d{1,2}:)?(?:\d{1,2}):(?:\d{1,2}))\s+(.+)$/gm;

        const chapters = [];
        let match;

        while ((match = chapterRegex.exec(description)) !== null) {
            const timestamp = match[1].trim(); // First capture group - timestamp only
            const title = match[2].trim(); // Second capture group - title only

            // Convert timestamp to seconds
            const timestampSegments = timestamp.split(':');
            let hours = 0,
                minutes,
                seconds;

            if (timestampSegments.length === 3) {
                [hours, minutes, seconds] = timestampSegments.map(Number);
            } else {
                [minutes, seconds] = timestampSegments.map(Number);
            }

            const totalSeconds = hours * 3600 + minutes * 60 + seconds;

            chapters.push({
                timestamp,
                title,
                seconds: totalSeconds,
            });
        }

        return chapters;
    }

    private getEmbedPlayer(videoId: string): string {
        const domain = this.plugin.settings.youtubeUsePrivacyEnhancedEmbed ? 'youtube-nocookie.com' : 'youtube.com';
        return `<iframe width="${this.plugin.settings.youtubeEmbedWidth}" height="${this.plugin.settings.youtubeEmbedHeight}" src="https://www.${domain}/embed/${videoId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    }
}

export default YoutubeParser;
