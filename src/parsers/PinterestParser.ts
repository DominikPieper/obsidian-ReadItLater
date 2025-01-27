import { request } from 'obsidian';
import { desktopBrowserUserAgent } from 'src/helpers/networkUtils';
import { normalizeFilename } from 'src/helpers/fileutils';
import { replaceImages } from 'src/helpers/replaceImages';
import { handleError } from 'src/helpers/error';
import { Note } from './Note';
import { Parser } from './Parser';

interface PinAuthor {
    fullName: string;
    username: string;
    profileURL: string;
}

interface Pin {
    id: string;
    url: string;
    title: string | null;
    description: string;
    link: string;
    image: string;
    author: PinAuthor;
    likeCount: number;
}

interface PinterestNoteData {
    date: string;
    pinId: string;
    pinURL: string;
    title: string;
    link: string;
    image: string;
    description: string;
    likeCount: number;
    authorName: string;
    authorProfileURL: string;
}

export class PinterestParser extends Parser {
    private PATTERN = /^https?:\/\/(?:[a-z]{2}\.|www\.)?pinterest\.(?:com|ca|co\.uk|fr|de|es|it)\/pin\/(\d+)\/?/i;

    public test(clipboardContent: string): boolean {
        return this.isValidUrl(clipboardContent) && this.PATTERN.test(clipboardContent);
    }

    public async prepareNote(clipboardContent: string): Promise<Note> {
        const createdAt = new Date();
        let pin: Pin;
        try {
            pin = await this.parseHtml(clipboardContent);
        } catch (e) {
            handleError(e, 'Unable to parse Pinterest note data.');
        }

        const fileName = this.templateEngine.render(this.plugin.settings.pinterestNoteTitle, {
            date: this.getFormattedDateForFilename(createdAt),
            authorName: pin.author.fullName || pin.author.username,
        });

        let content = this.renderContent({
            date: this.getFormattedDateForContent(createdAt),
            pinId: pin.id,
            pinURL: pin.url,
            title: pin.title,
            link: pin.link,
            image: pin.image,
            description: pin.description,
            likeCount: pin.likeCount,
            authorName: pin.author.fullName || pin.author.username,
            authorProfileURL: pin.author.profileURL,
        });

        if (this.plugin.settings.downloadPinterestImage) {
            const assetsDir = this.templateEngine.render(this.plugin.settings.assetsDir, {
                date: this.getFormattedDateForFilename(createdAt),
                fileName: normalizeFilename(fileName),
                contentType: this.plugin.settings.pinterestContentTypeSlug,
            });

            content = await replaceImages(this.plugin, normalizeFilename(fileName), content, assetsDir);
        }

        return new Note(fileName, 'md', content, this.plugin.settings.pinterestContentTypeSlug, createdAt);
    }

    private renderContent(data: PinterestNoteData): string {
        return this.templateEngine.render(this.plugin.settings.pinterestNote, data);
    }

    private async parseHtml(url: string): Promise<Pin> {
        const response = await request({
            method: 'GET',
            url: url,
            headers: { ...desktopBrowserUserAgent },
        });
        const document = new DOMParser().parseFromString(response, 'text/html');

        const relayResponseElements = document.querySelectorAll("[data-relay-response='true']");
        let desktopRelayResponse;
        relayResponseElements.forEach((el) => {
            const jsonData = JSON.parse(el.textContent);
            if (jsonData?.variables?.isDesktop === true) {
                desktopRelayResponse = jsonData;
            }
        });
        if (desktopRelayResponse === undefined) {
            desktopRelayResponse = JSON.parse(relayResponseElements?.[0].textContent) ?? {};
        }

        const pinJsonData = desktopRelayResponse?.response?.data?.v3GetPinQuery?.data;

        if (pinJsonData === undefined) {
            throw new Error('pinJsonData is undefined');
        }

        const pinner = pinJsonData?.originPinner ?? pinJsonData?.pinner ?? {};

        return {
            id: url.match(this.PATTERN)[1],
            url: url,
            title: pinJsonData?.title ?? document.querySelector('h1')?.textContent ?? '',
            description:
                pinJsonData?.descriotion ??
                document.querySelector("[data-test-id='truncated-description'] div div")?.textContent ??
                '',
            link:
                pinJsonData?.link ??
                document.querySelector("meta[property='pinterestapp:source']")?.getAttribute('content') ??
                document.querySelector("meta[property='og:see_also']")?.getAttribute('content'),
            image:
                pinJsonData?.imageSpec_orig?.url ??
                document.querySelector("[data-test-id='pin-closeup-image'] img")?.getAttribute('src') ??
                '',
            author: {
                fullName: pinner?.fullName ?? '',
                username: pinner?.username ?? '',
                profileURL: `https://www.pinterest.com/${pinner?.username ?? ''}`,
            },
            likeCount:
                pinJsonData?.reactionCountsData?.find((countData: any) => countData?.reactionType === 1)
                    ?.reactionCount ?? 0,
        };
    }
}
