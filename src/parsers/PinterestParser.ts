import { App, request } from 'obsidian';
import { ReadItLaterSettings } from '../settings';
import { Note } from './Note';
import { Parser } from './Parser';

//#region Interfaces
interface PinterestUser {
    name: string;
    url: string;
}

interface PinterestImage {
    // https://gist.github.com/jpsirois/7001965
    large: string;
    originals: string;
}

interface RelayData {
    link: string;
    imageLargeUrl: string;
    description: string;
    closeupDescription: string;
    autoAltText: string;
    board: RelayBoard;
    imageSpec_orig: ImageSpec;
    pinJoin: RelayPinJoin;
    pinner: RelayDataPinner;
}
interface RelayDataPinner {
    fullName: string;
    imageSmallUrl: string;
    imageMediumUrl: string;
    imageLargeUrl: string;
    username: string;
    firstName: string;
}

interface RelayBoard {
    url: string;
}
interface RelayPinJoin {
    visualAnnotation: Array<string>;
}
interface ImageSpec {
    url: string;
}

interface PinterestPin {
    id: string;
    url: string;
    title: string;
    description: string;
    descriptionLong: string;
    resource: string;
    altText: string;
    tags: Array<string>;

    pinner: PinterestUser;
    image: PinterestImage;
}

//#endregion

class PinterestParser extends Parser {
    private PATTERN = /pinterest\.com\/pin\/.+/;

    constructor(app: App, settings: ReadItLaterSettings) {
        super(app, settings);
    }

    test(clipboardContent: string): boolean | Promise<boolean> {
        const x = this.isValidUrl(clipboardContent) && this.PATTERN.test(clipboardContent);
        return x;
    }

    async prepareNote(clipboardContent: string): Promise<Note> {
        const process = async () => {
            try {
                const pinPage = await this.parseHtml(clipboardContent);

                const tags = () =>
                    pinPage?.tags
                        .reduce((a, i) => {
                            return this.settings.pinterestParentTag.length > 0
                                ? `${a}${this.settings.pinterestParentTag}/${i.replace(/ /g, '_')} `
                                : `${a}#${i.replace(/ /g, '_')} `;
                        }, '')
                        .trim();

                const content = this.settings.pinterestNote
                    .replace(/%date%/g, this.getFormattedDateForContent())
                    .replace(/%videoDescription%/g, pinPage.description)
                    .replace(/%videoId%/g, pinPage.id)
                    .replace(/%title%/g, pinPage.title)
                    .replace(/%videoURL%/g, pinPage.url)
                    .replace(/%authorName%/g, pinPage.pinner.name)
                    .replace(/%authorURL%/g, pinPage.pinner.url)
                    .replace(/%img%/g, pinPage.image.originals)
                    .replace(/%imgLarge%/g, pinPage.image.large)
                    .replace(/%altText%/g, pinPage.altText)
                    .replace(/%resource%/g, pinPage.resource)
                    .replace(/%descriptionLong%/g, pinPage.descriptionLong)
                    .replace(/%tags%/g, tags);

                const fileNameTemplate = this.settings.pinterestNoteTitle
                    .replace(/%authorName%/g, pinPage.pinner.name)
                    .replace(/%date%/g, this.getFormattedDateForFilename());

                return [content, fileNameTemplate];
            } catch (e) {
                console.warn(e);
                return [
                    `error processing ${clipboardContent}`,
                    `Pinterest [ERROR] ${this.getFormattedDateForFilename()}`,
                ];
            }
        };
        const [content, fileNameTemplate] = await process();
        const fileName = `${fileNameTemplate}.md`;
        return new Note(fileName, content);
    }

    private async parseHtml(url: string): Promise<PinterestPin> {
        const response = await request({
            method: 'GET',
            url,
            headers: {
                'user-agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
            },
        });

        const html = new DOMParser().parseFromString(response, 'text/html');
        const dataRelayResponse: RelayData = JSON.parse(html.querySelector('script[data-relay-response]')?.textContent)
            ?.response?.data?.v3GetPinQuery?.data;
        const pinTitle = html.querySelector('[data-test-id="pinTitle"] h1')?.textContent ?? '<!-- no title -->';
        const tags = dataRelayResponse.pinJoin.visualAnnotation ?? [];
        const link = dataRelayResponse.link ?? '<!-- no link -->';
        const description = dataRelayResponse.description ?? '<!-- no description//-->';
        const descriptionLong = dataRelayResponse.closeupDescription ?? '<!-- no long description//-->';
        const pinnerName = dataRelayResponse.pinner.fullName ?? 'unknown pinner';
        const pinnerUrl =
            html.querySelector('meta[name="pinterestapp:pinner"]').getAttribute('content') ??
            'https://www.pinterest.com';

        return {
            id: 'to be done',
            url: html.querySelector('meta[property="og:url"]')?.getAttribute('content') ?? url,
            description: description ?? '',
            descriptionLong: descriptionLong ?? '',
            resource: link,
            title: pinTitle,
            tags: tags,
            pinner: {
                name: pinnerName,
                url: pinnerUrl,
            },
            altText: dataRelayResponse.autoAltText,
            image: {
                large: dataRelayResponse.imageLargeUrl,
                originals: dataRelayResponse.imageSpec_orig.url,
            },
        };
    }
}

export default PinterestParser;
