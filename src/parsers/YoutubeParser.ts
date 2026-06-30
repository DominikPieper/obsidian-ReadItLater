import { moment, request } from 'obsidian';
import { Duration, parse, toSeconds } from 'iso8601-duration';
import { handleError } from 'src/helpers/error';
import { getJavascriptDeclarationByName } from 'src/helpers/domUtils';
import { desktopBrowserUserAgent } from 'src/helpers/networkUtils';
import { Note } from './Note';
import { Parser } from './Parser';

// YouTube's public InnerTube API key and an iOS client User-Agent. The iOS client returns caption
// track URLs that work without a proof-of-origin token; see `getVideoTranscript`.
const YOUTUBE_INNERTUBE_API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
const YOUTUBE_IOS_USER_AGENT = 'com.google.ios.youtube/20.10.38 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X)';

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
    videoTranscript: string;
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

interface YoutubeTranscriptSegment {
    text: string;
    seconds: number;
}

interface YoutubeChannel {
    thumbnails: GoogleApiYouTubeThumbnailResource;
}

class YoutubeParser extends Parser {
    private PATTERN =
        /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]+)(?:\?([^&\s]+(?:&[^&\s]+)*))?/;

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

            const tags: string[] =
                video.snippet?.tags?.map((tag) => tag.replace(/[\s:\-_.]/g, '').replace(/^/, '#')) ?? [];

            const chapters = this.getVideoChapters(video.snippet.description);

            const videoTranscript = await this.getVideoTranscript(video.id);

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
                videoTranscript: videoTranscript,
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
        } catch (error) {
            handleError(error, 'Unable to parse Youtube API response.');
        }
    }

    private async parseSchema(url: string, createdAt: Date): Promise<YoutubeNoteData> {
        try {
            const response = await request({
                method: 'GET',
                url,
                headers: { ...desktopBrowserUserAgent },
            });

            const videoHTML = new DOMParser().parseFromString(response, 'text/html');

            const declaration = getJavascriptDeclarationByName('ytInitialData', videoHTML.querySelectorAll('script'));
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
            const publishedAt =
                jsonData?.engagementPanels?.[5]?.engagementPanelSectionListRenderer?.content
                    ?.structuredDescriptionContentRenderer?.items?.[0]?.videoDescriptionHeaderRenderer?.publishDate
                    ?.simpleText ?? '';
            const videoViewsCount =
                jsonData?.contents?.twoColumnWatchNextResults?.results?.results?.contents?.[0]?.videoPrimaryInfoRenderer
                    ?.viewCount?.videoViewCountRenderer?.originalViewCount ?? 0;
            const channelId =
                jsonData?.contents?.twoColumnWatchNextResults?.results?.results?.contents?.[1]
                    ?.videoSecondaryInfoRenderer?.subscribeButton?.subscribeButtonRenderer?.channelId ??
                videoSchemaElement?.querySelector('[itemprop="channelId"]')?.getAttribute('content') ??
                '';

            const videoTranscript = await this.getVideoTranscript(videoId);

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
                videoPublishDate:
                    publishedAt !== ''
                        ? moment(publishedAt, ['MMM D, YYYY', 'MMMM D, YYYY', 'D MMM YYYY', moment.ISO_8601]).format(
                              this.plugin.settings.dateContentFmt,
                          )
                        : '',
                videoViewsCount: videoViewsCount,
                videoTags: '',
                videoChapters: this.formatVideoChapters(videoId, chapters),
                videoTranscript: videoTranscript,
                channelId: channelId,
                channelURL: personSchemaElement?.querySelector('[itemprop="url"]')?.getAttribute('href') ?? '',
                channelName: personSchemaElement?.querySelector('[itemprop="name"]')?.getAttribute('content') ?? '',
                extra: null,
            };
        } catch (error) {
            handleError(error, 'Unable to parse Youtube schema from DOM.');
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
                return this.templateEngine.render(this.plugin.settings.youtubeChapter, {
                    chapterTimestamp: chapter.timestamp,
                    chapterTitle: chapter.title,
                    chapterSeconds: chapter.seconds,
                    chapterUrl: `https://www.youtube.com/watch?v=${videoId}&t=${chapter.seconds}`,
                });
            }, this)
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

    /**
     * Fetches the video transcript (closed captions) as plain text.
     *
     * The caption track URLs embedded in the watch page (and the public timedtext endpoint) require
     * a proof-of-origin token and return empty bodies for non-browser requests. Querying the
     * InnerTube `player` endpoint with the iOS client returns caption track URLs that still work
     * without such a token. (The ANDROID client stopped returning captions in early 2026.)
     */
    private async getVideoTranscript(videoId: string): Promise<string> {
        if (!this.plugin.settings.youtubeFetchTranscript) {
            return '';
        }

        try {
            const language = this.plugin.settings.youtubeTranscriptLanguage || 'en';

            const playerResponse = JSON.parse(
                await request({
                    method: 'POST',
                    url: `https://www.youtube.com/youtubei/v1/player?key=${YOUTUBE_INNERTUBE_API_KEY}`,
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': YOUTUBE_IOS_USER_AGENT,
                    },
                    body: JSON.stringify({
                        context: {
                            client: { clientName: 'IOS', clientVersion: '20.10.38', hl: language, gl: 'US' },
                        },
                        videoId,
                    }),
                }),
            );

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const captionTracks: any[] = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
            if (captionTracks.length === 0) {
                return '';
            }

            const track =
                captionTracks.find((captionTrack) => captionTrack.languageCode === language) ??
                captionTracks.find((captionTrack) => captionTrack.languageCode?.startsWith(`${language}-`)) ??
                captionTracks.find((captionTrack) => captionTrack.kind !== 'asr') ??
                captionTracks[0];

            const transcriptXml = await request({
                method: 'GET',
                url: track.baseUrl,
                headers: { 'Accept-Language': 'en-US,en;q=0.9' },
            });

            return this.formatVideoTranscript(videoId, this.parseTranscriptSegments(transcriptXml));
        } catch (error) {
            // A missing/unavailable transcript should not block note creation.
            return '';
        }
    }

    private parseTranscriptSegments(xml: string): YoutubeTranscriptSegment[] {
        const textTagRegex = /<text\s+start="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
        const segments: YoutubeTranscriptSegment[] = [];
        let match;

        while ((match = textTagRegex.exec(xml)) !== null) {
            const text = this.decodeHtmlEntities(match[2].replace(/<[^>]+>/g, ''))
                .replace(/\s+/g, ' ')
                .trim();
            if (text === '') {
                continue;
            }
            segments.push({ text, seconds: Math.floor(parseFloat(match[1])) });
        }

        return segments;
    }

    private formatVideoTranscript(videoId: string, segments: YoutubeTranscriptSegment[]): string {
        // Group several caption segments into one block so each line is a readable chunk of text
        // prefixed by a single linked timestamp, instead of one tiny fragment per line.
        const linesPerBlock = Math.max(1, this.plugin.settings.youtubeTranscriptLinesPerBlock);
        const blocks: YoutubeTranscriptSegment[] = [];

        segments.forEach((segment, index) => {
            if (index % linesPerBlock === 0) {
                blocks.push({ text: segment.text, seconds: segment.seconds });
            } else {
                blocks[blocks.length - 1].text += ` ${segment.text}`;
            }
        });

        return blocks
            .map((block) => {
                return this.templateEngine.render(this.plugin.settings.youtubeTranscriptLine, {
                    transcriptTimestamp: this.formatTimestamp(block.seconds),
                    transcriptText: block.text.trim(),
                    transcriptSeconds: block.seconds,
                    transcriptUrl: `https://www.youtube.com/watch?v=${videoId}&t=${block.seconds}`,
                });
            }, this)
            .join('\n');
    }

    private formatTimestamp(totalSeconds: number): string {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const pad = (value: number): string => String(value).padStart(2, '0');

        return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
    }

    private decodeHtmlEntities(text: string): string {
        return text
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&apos;/g, "'")
            .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
            .replace(/&#x([a-fA-F0-9]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
    }

    private getEmbedPlayer(videoId: string): string {
        const domain = this.plugin.settings.youtubeUsePrivacyEnhancedEmbed ? 'youtube-nocookie.com' : 'youtube.com';
        return `<iframe width="${this.plugin.settings.youtubeEmbedWidth}" height="${this.plugin.settings.youtubeEmbedHeight}" src="https://www.${domain}/embed/${videoId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    }
}

export default YoutubeParser;
