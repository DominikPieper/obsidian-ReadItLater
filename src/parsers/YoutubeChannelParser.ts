import { request } from 'obsidian';
import { getJavascriptDeclarationByName } from 'src/helpers/domUtils';
import { handleError } from 'src/helpers/error';
import { getDesktopBrowserUserAgent } from 'src/helpers/networkUtils';
import { Note } from './Note';
import { Parser } from './Parser';

interface YoutubeChannelNoteData {
    date: string;
    channelId: string;
    channelTitle: string;
    channelDescription: string;
    channelURL: string;
    channelAvatar: string;
    channelBanner: string;
    channelSubscribersCount: number;
    channelVideosCount: number;
    channelVideosURL: string;
    channelShortsURL: string;
}

export default class YoutubeChannelParser extends Parser {
    private PATTERN =
        /^(https?:\/\/(?:(?:www|m)\.)?youtube\.com\/(?:channel\/(UC[\w-]{22})|c\/([^\s\/]+)|@([\w-]+)))(?:\/.*)?$/u;

    test(url: string): boolean {
        return this.isValidUrl(url) && this.PATTERN.test(url);
    }

    async prepareNote(url: string): Promise<Note> {
        const createdAt = new Date();
        const data =
            this.plugin.settings.youtubeApiKey === ''
                ? await this.parseSchema(url, createdAt)
                : await this.parseApiResponse(url, createdAt);

        const content = this.templateEngine.render(this.plugin.settings.youtubeChannelNote, data);

        const fileNameTemplate = this.templateEngine.render(this.plugin.settings.youtubeChannelNoteTitle, {
            title: data.channelTitle,
            date: this.getFormattedDateForFilename(createdAt),
        });

        return new Note(fileNameTemplate, 'md', content, this.plugin.settings.youtubeChannelContentTypeSlug, createdAt);
    }

    private async parseSchema(url: string, createdAt: Date): Promise<YoutubeChannelNoteData> {
        try {
            const response = await request({
                method: 'GET',
                url,
                headers: { ...getDesktopBrowserUserAgent() },
            });

            const [, channelURL] = this.PATTERN.exec(url);
            const channelHTML = new DOMParser().parseFromString(response, 'text/html');
            const declaration = getJavascriptDeclarationByName('ytInitialData', channelHTML.querySelectorAll('script'));
            const jsonData = typeof declaration !== 'undefined' ? JSON.parse(declaration.value) : {};

            const jsonDataSubscribersCount =
                jsonData?.header?.pageHeaderRenderer?.content?.pageHeaderViewModel?.metadata?.contentMetadataViewModel
                    ?.metadataRows?.[1]?.metadataParts?.[0]?.text.content;
            if (jsonDataSubscribersCount === null) {
                console.warn('Unable to parse subscribers count.');
            }

            const jsonDataVideosCount =
                jsonData?.header?.pageHeaderRenderer?.content?.pageHeaderViewModel?.metadata?.contentMetadataViewModel
                    ?.metadataRows?.[1]?.metadataParts?.[1]?.text.content;
            if (jsonDataVideosCount === null) {
                console.warn('Unable to parse subscribers count.');
            }

            return {
                date: this.getFormattedDateForContent(createdAt),
                channelId: jsonData?.metadata?.channelMetadataRenderer?.externalId ?? '',
                channelTitle: jsonData?.metadata?.channelMetadataRenderer?.title ?? '',
                channelDescription: jsonData?.metadata?.channelMetadataRenderer?.description ?? '',
                channelURL: channelURL,
                channelAvatar: jsonData?.metadata?.channelMetadataRenderer?.avatar?.thumbnails?.[0]?.url ?? '',
                channelBanner:
                    jsonData?.header?.pageHeaderRenderer?.content?.pageHeaderViewModel?.banner?.imageBannerViewModel
                        ?.image?.sources?.[0]?.url ?? '',
                channelSubscribersCount: this.parseNumberValue(jsonDataSubscribersCount ?? ''),
                channelVideosCount: this.parseNumberValue(jsonDataVideosCount ?? ''),
                channelVideosURL: `${channelURL}/videos`,
                channelShortsURL: `${channelURL}/shorts`,
            };
        } catch (error) {
            handleError(error, 'Unable to parse Youtube channel schema from DOM.');
        }
    }

    private async parseApiResponse(url: string, createdAt: Date): Promise<YoutubeChannelNoteData> {
        const apiURL = new URL(
            'https://youtube.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics,brandingSettings',
        );

        const [, channelURL, channelId, legacyUsername, handle] = this.PATTERN.exec(url);
        if (channelId) {
            apiURL.searchParams.append('id', channelId);
        } else if (handle) {
            apiURL.searchParams.append('forHandle', handle);
        } else if (legacyUsername) {
            // if channel name contains special international characters, API does not return valid response
            const channelNoteDOMData = await this.parseSchema(url, createdAt);
            apiURL.searchParams.append('id', channelNoteDOMData.channelId);
        } else {
            throw new Error('Unable to compose Youtube API URL');
        }

        apiURL.searchParams.append('key', this.plugin.settings.youtubeApiKey);

        try {
            const channelApiResponse = await request({
                method: 'GET',
                url: apiURL.toString(),
                headers: {
                    Accept: 'application/json',
                },
            });

            const channelJsonResponse = JSON.parse(channelApiResponse);
            if (channelJsonResponse.items.length === 0) {
                throw new Error(`Channel (${url}) cannot be fetched from API`);
            }
            const channel: GoogleApiYouTubeChannelResource = channelJsonResponse.items[0];

            return {
                date: this.getFormattedDateForContent(createdAt),
                channelId: channel.id,
                channelTitle: channel.snippet.title,
                channelDescription: channel.snippet.description,
                channelURL: channelURL,
                channelAvatar: channel.snippet.thumbnails?.high.url ?? channel.snippet.thumbnails.default.url,
                channelBanner: channel.brandingSettings?.image?.bannerExternalUrl ?? '',
                channelSubscribersCount: channel.statistics.subscriberCount,
                channelVideosCount: channel.statistics.videoCount,
                channelVideosURL: `${channelURL}/videos`,
                channelShortsURL: `${channelURL}/shorts`,
            };
        } catch (error) {
            handleError(error, 'Unable to parse Youtube channel API response.');
        }
    }

    private parseNumberValue(numberValue: string): number {
        const numberValueRegex = /(\d+(?:\.\d+)?)(K|M|B)?/;
        const match = numberValue.match(numberValueRegex);
        if (!match) {
            return 0;
        }

        const [, number, notation] = match;

        if (typeof notation === 'undefined') {
            return Number(number);
        }

        switch (notation) {
            case 'K':
                return Number(number) * 1000;
            case 'M':
                return Number(number) * 1000000;
            case 'B':
                return Number(number) * 1000000000;
        }
    }
}
