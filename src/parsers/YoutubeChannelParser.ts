import { handleError } from "src/helpers";
import { Note } from "./Note";
import { Parser } from "./Parser";
import { request } from "obsidian";
import { getJavascriptDeclarationByName } from "src/helpers/domUtils";

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
    private PATTERN = /^(https?:\/\/(?:(?:www|m)\.)?youtube\.com\/(?:channel\/(UC[\w-]{22})|c\/([^\s\/]+)|@([\w-]+)))(?:\/.*)?$/u;

    test(url: string): boolean {
        return this.isValidUrl(url) && this.PATTERN.test(url);
    }

    async prepareNote(url: string): Promise<Note> {
        const createdAt = new Date();
        const data =
            this.plugin.settings.youtubeApiKey === ''
                ? await this.parseSchema(url, createdAt)
                : await this.parseApiResponse(url, createdAt);
        console.log(data);

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
                headers: {
                    'user-agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                },
            });

            const [, channelURL] = this.PATTERN.exec(url);
            const channelHTML = new DOMParser().parseFromString(response, 'text/html');
            const declaration = getJavascriptDeclarationByName('ytInitialData', channelHTML.querySelectorAll('script'));
            const jsonData = JSON.parse(declaration.value);

            const jsonDataSubscribersCount = jsonData?.header?.pageHeaderRenderer?.content?.pageHeaderViewModel?.metadata?.contentMetadataViewModel?.metadataRows?.[1]?.metadataParts?.[0]?.text.content;
            if (jsonDataSubscribersCount === null) {
                console.warn('Unable to parse subscribers count.');
            }

            const jsonDataVideosCount = jsonData?.header?.pageHeaderRenderer?.content?.pageHeaderViewModel?.metadata?.contentMetadataViewModel?.metadataRows?.[1]?.metadataParts?.[1]?.text.content;
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
                channelBanner: jsonData?.header?.pageHeaderRenderer?.content?.pageHeaderViewModel?.banner?.imageBannerViewModel?.image?.sources?.[0]?.url ?? '',
                channelSubscribersCount: this.parseNumberValue(jsonDataSubscribersCount ?? ''),
                channelVideosCount: this.parseNumberValue(jsonDataVideosCount ?? ''),
                channelVideosURL: `${channelURL}/videos`,
                channelShortsURL: `${channelURL}/shorts`
            }
        } catch (error) {
            handleError(error);
        }
    }

    private async parseApiResponse(url: string, createdAt: Date): Promise<YoutubeChannelNoteData> {
        return { channelId: '', channelURL: '', channelName: '' };
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
